from collections import defaultdict
from django.core.exceptions import ValidationError
from django.db.models import Count, Q, Prefetch, F, When, Case, Value, CharField
from fms_core.utils import remove_empty_str_from_dict
from fms_core.services.container import create_container

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.containers import PARENT_CONTAINER_KINDS, SAMPLE_CONTAINER_KINDS
from fms_core.models import Container, Sample, Coordinate
from fms_core.filters import ContainerFilter
from ._constants import _container_filterset_fields

from fms_core.template_importer.importers import ContainerCreationImporter, ContainerRenameImporter, ContainerMoveImporter

from fms_core.serializers import (
    ContainerSerializer,
    ContainerExportSerializer,
)

from fms_core.templates import (
    CONTAINER_CREATION_TEMPLATE,
    CONTAINER_MOVE_TEMPLATE,
    CONTAINER_RENAME_TEMPLATE,
)

from ._utils import TemplateActionsMixin, TemplatePrefillsMixin, versions_detail, _list_keys

class ContainerViewSet(viewsets.ModelViewSet, TemplateActionsMixin, TemplatePrefillsMixin):
    queryset = Container.objects.select_related("location").prefetch_related("children",
                          Prefetch('samples', queryset=Sample.objects.order_by('coordinate__column'))).all().distinct()

    serializer_class = ContainerSerializer
    filterset_class = ContainerFilter

    ordering_fields = (
        *_list_keys(_container_filterset_fields),
    )

    ordering = ["-id"]

    template_action_list = [
        {
            "name": "Add Containers",
            "description": "Upload the provided template with up to 100 new containers.",
            "template": [CONTAINER_CREATION_TEMPLATE["identity"]],
            "importer": ContainerCreationImporter,
        },
        {
            "name": "Move Containers",
            "description": "Upload the provided template with up to 100 containers to move.",
            "template": [CONTAINER_MOVE_TEMPLATE["identity"]],
            "importer": ContainerMoveImporter,
        },
        {
            "name": "Rename Containers",
            "description": "Upload the provided template with up to 384 containers to rename.",
            "template": [CONTAINER_RENAME_TEMPLATE["identity"]],
            "importer": ContainerRenameImporter,
        },
    ]

    template_prefill_list = [
        {"template": CONTAINER_MOVE_TEMPLATE},
        {"template": CONTAINER_RENAME_TEMPLATE},
    ]

    def get_queryset(self):
        container_name = self.request.query_params.get('location__name__recursive')
        recursive = not container_name is None

        if recursive:
            containers = Container.objects.all()
            if container_name:
                containers = containers.filter(name=container_name)

            container_ids = tuple(containers.values_list('id', flat=True))

            if not container_ids:
                container_ids = tuple([None])

            parent_containers = Container.objects.raw('''WITH RECURSIVE parent(id, location_id) AS (
                                                                   SELECT id, location_id
                                                                   FROM fms_core_container
                                                                   WHERE id IN %s
                                                                   UNION ALL
                                                                   SELECT child.id, child.location_id
                                                                   FROM fms_core_container AS child, parent
                                                                   WHERE child.location_id = parent.id
                                                               )
                                                               SELECT * FROM parent''', params=[container_ids])

            return self.queryset.filter(location__in=parent_containers)

        return self.queryset

    def create(self, request):
        container = request.data
        container_parent = None
        coordinates = None

        try:
            if container['name'] and Container.objects.filter(name=container['name']).exists():
                raise ValidationError({"name": f"Container with name {container['name']} already exists."})
            if not container['name'] and Container.objects.filter(name=container['barcode']).exists():
                raise ValidationError({"barcode": f"Container with name {container['barcode']} already exists. Missing container name, barcode will replace container name."})
            container = remove_empty_str_from_dict(container)
            if container['location']:
                try:
                    container_parent = Container.objects.get(id=container['location'])
                except Exception as err:
                    raise ValidationError({"location": f"Failed to find parent container with ID {container['location']}."})
            if container['coordinate']:
                try:
                    coordinates = Coordinate.objects.get(id=container['coordinate']).name
                except Exception as err:
                    raise ValidationError({"coordinate": f"Failed to find coordinate with ID {container['coordinate']}."})
            container_obj, errors, warnings = create_container(barcode=container['barcode'], kind=container['kind'], name=container['name'], coordinates=coordinates, container_parent=container_parent, creation_comment=container['comment'])
            serializer = ContainerSerializer(container_obj)
        except Exception as errors:
            raise ValidationError(errors)
        
        return Response(serializer.data)

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = ContainerExportSerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of containers in the
        database. Useful for displaying overview information in dashboard
        front-ends and getting quick figures without needing to download actual
        container records.
        """
        return Response({
            "total_count": Container.objects.all().count(),
            "root_count": Container.objects.filter(location_id__isnull=True).count(),
            "kind_counts": {
                c["kind"]: c["kind__count"]
                for c in Container.objects.values("kind").annotate(Count("kind"))
            },
        })

    @action(detail=False, methods=["get"])
    def list_root(self, _request):
        """
        Lists all "root" containers, i.e. containers which are not nested
        within another container and are at the root of the tree.
        """

        # TODO: Can be replaced by ?location__isnull=True query param
        containers_data = Container.objects.filter(location_id__isnull=True).prefetch_related("children", "samples")
        page = self.paginate_queryset(containers_data)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(containers_data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for parent containers that match the given query
        """
        search_input = _request.GET.get("q", None)
        is_parent = _request.GET.get("parent") == 'true'
        is_sample_holding = _request.GET.get("sample_holding") == 'true'
        is_exact_match = _request.GET.get("exact_match") == 'true'
        qs_except_kinds = _request.GET.get("except_kinds")
        except_kinds = qs_except_kinds.split(",") if qs_except_kinds else []

        if search_input is not None:
            if is_exact_match:
                query = Q(barcode=search_input)
                query.add(Q(name=search_input), Q.OR)
                query.add(Q(id=search_input), Q.OR)
            else:
                query = Q(barcode__icontains=search_input)
                query.add(Q(name__icontains=search_input), Q.OR)
                query.add(Q(id__icontains=search_input), Q.OR)
            if is_parent:
                kinds = [kind for kind in PARENT_CONTAINER_KINDS if kind not in except_kinds]
                query.add(Q(kind__in=kinds), Q.AND)
            if is_sample_holding:
                kinds = [kind for kind in SAMPLE_CONTAINER_KINDS if kind not in except_kinds]
                query.add(Q(kind__in=kinds), Q.AND)
            containers_data = Container.objects.filter(query)
        else:
            containers_data = Container.objects.all()

        page = self.paginate_queryset(containers_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = ContainerExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def list_children(self, _request, pk=None):
        """
        Lists all containers that are direct children of a specified container.
        """
        # TODO: Can be replaced by ?location=pk query param
        serializer = self.get_serializer(Container.objects.filter(location_id=pk), many=True)
        return Response(serializer.data)


    @action(detail=True, methods=["get"])
    def list_parents(self, _request, pk=None):
        """
        Traverses a container's parent hierarchy and returns a list, in order
        from closest-to-root to the queried container, of all the containers in
        that tree traversal.
        """
        containers = []
        current = Container.objects.get(pk=pk).location
        while current:
            containers.append(current)
            current = current.location
        containers.reverse()
        serializer = self.get_serializer(containers, many=True)
        return Response(serializer.data)

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        """
        Lists all django_reversion Version objects associated with a container.
        """
        return versions_detail(self.get_object())
    
    