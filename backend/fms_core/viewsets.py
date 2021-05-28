import json

from collections import Counter
from django.conf import settings
from django.contrib.auth.models import User, Group
from django.db.models import Count, Q, Func, F
from django.db.models.functions import Greatest
from django.http.response import HttpResponseNotFound, HttpResponseBadRequest
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, DjangoModelPermissions
from rest_framework.response import Response
from reversion.models import Version, Revision
from tablib import Dataset
from typing import Any, Dict, List, Tuple, Union

from .containers import ContainerSpec, CONTAINER_KIND_SPECS, PARENT_CONTAINER_KINDS, SAMPLE_CONTAINER_KINDS
from .models import Container, Sample, Individual, SampleKind, Protocol, ProcessMeasurement, Process, SampleLineage
from .resources import (
    ContainerResource,
    ContainerMoveResource,
    ContainerRenameResource,
    ExtractionResource,
    TransferResource,
    SampleResource,
    SampleUpdateResource,
)
from .serializers import (
    ContainerSerializer,
    ContainerExportSerializer,
    SampleKindSerializer,
    ProtocolSerializer,
    ProcessMeasurementSerializer,
    ProcessMeasurementExportSerializer,
    SampleSerializer,
    SampleExportSerializer,
    NestedSampleSerializer,
    IndividualSerializer,
    VersionSerializer,
    RevisionSerializer,
    UserSerializer,
    GroupSerializer,
)
from .template_paths import (
    CONTAINER_CREATION_TEMPLATE,
    CONTAINER_MOVE_TEMPLATE,
    CONTAINER_RENAME_TEMPLATE,
    SAMPLE_EXTRACTION_TEMPLATE,
    SAMPLE_TRANSFER_TEMPLATE,
    SAMPLE_SUBMISSION_TEMPLATE,
    SAMPLE_UPDATE_TEMPLATE,
)

__all__ = [
    "ContainerKindViewSet",
    "ContainerViewSet",
    "IndividualViewSet",
    "QueryViewSet",
    "SampleViewSet",
    "SampleKindViewSet",
    "ProtocolViewSet",
    "UserViewSet",
    "GroupViewSet",
    "VersionViewSet",
    "RevisionViewSet",
]


FREE_TEXT_FILTERS = ["contains", "icontains", "startswith"]
CATEGORICAL_FILTERS = ["exact", "in"]
CATEGORICAL_FILTERS_LOOSE = [*CATEGORICAL_FILTERS, *FREE_TEXT_FILTERS]
FK_FILTERS = CATEGORICAL_FILTERS
PK_FILTERS = ["in"]
NULLABLE_FK_FILTERS = [*FK_FILTERS, "isnull"]
SCALAR_FILTERS = ["exact", "lt", "lte", "gt", "gte"]
DATE_FILTERS = [*SCALAR_FILTERS, "year", "month", "week", "week_day", "day"]


def versions_detail(obj):
    versions = Version.objects.get_for_object(obj)
    serializer = VersionSerializer(versions, many=True)
    return Response(serializer.data)


# noinspection PyMethodMayBeStatic,PyUnusedLocal
class ContainerKindViewSet(viewsets.ViewSet):
    pagination_class = None
    permission_classes = [AllowAny]

    def list(self, request):
        return Response(data=[s.serialize() for s in ContainerSpec.container_specs])

    def retrieve(self, request, pk=None):
        if pk in CONTAINER_KIND_SPECS:
            return Response(data=CONTAINER_KIND_SPECS[pk].serialize())
        return HttpResponseNotFound(json.dumps({"detail": f"Could not find container kind '{pk}'"}),
                                    content_type="application/json")


class TemplateActionsMixin:
    # When this mixin is used, this list will be overridden to provide a list
    # of template actions for the viewset implementation.
    template_action_list = []

    @classmethod
    def _get_action(cls, request) -> Tuple[bool, Union[str, Tuple[dict, Dataset]]]:
        """
        Gets template action from request data. Requests should be
        multipart/form-data, with two key-value pairs:
            action: index of the template action (based on the list provided by template_actions/)
            template: completed template file with data
        Returns a tuple of:
            bool
                True if an error occurred, False if the request was processed
                to the point of reading the file into a dataset.
            Union[str, Tuple[dict, Dataset]]
                str if an error occured, where the string is the error message.
                Dataset otherwise, with the contents of the uploaded file.
        """

        action_id = request.POST.get("action")
        template_file = request.FILES.get("template")

        if action_id is None or template_file is None:
            return True, "Action or template file not found"

        try:
            action_def = cls.template_action_list[int(action_id)]
        except (KeyError, ValueError):
            # If the action index is out of bounds or not int-castable, return an error.
            return True, f"Action {action_id} not found"

        # There are only two file types accepted; .xlsx and .csv. XLSX files
        # must be treated differently since it's binary data.

        xlsx = template_file.name.endswith("xlsx")
        file_bytes = template_file.read()

        dataset = Dataset().load(file_bytes if xlsx else file_bytes.decode("utf-8"), format="xlsx" if xlsx else "csv")

        return False, (action_def, dataset)

    @action(detail=False, methods=["get"])
    def template_actions(self, request):
        """
        Endpoint off of the parent viewset for listing available template
        actions, converting paths to URIs for better RESTyness.
        """
        return Response([
            {k: request.build_absolute_uri(v) if k == "template" else v for k, v in a.items() if k != "resource"}
            for a in self.template_action_list
        ])

    @action(detail=False, methods=["post"])
    def template_check(self, request):
        """
        Checks a template submission without saving any of the data to the
        database. Used to check for errors prior to final submission.
        """

        error, action_data = self._get_action(request)
        if error:
            return HttpResponseBadRequest(json.dumps({"detail": action_data}), content_type="application/json")

        action_def, dataset = action_data

        resource_instance = action_def["resource"]()
        result = resource_instance.import_data(dataset, dry_run=True)

        return Response({
            "diff_headers": result.diff_headers,
            "valid": not (result.has_errors() or result.has_validation_errors()),
            "has_warnings" : any([r.warnings for r in result.rows]),
            "base_errors": [{
                "error": str(e.error),
                "traceback": e.traceback if settings.DEBUG else "",
            } for e in result.base_errors],
            "rows": [{
                "errors": [{
                    "error": str(e.error),
                    "traceback": e.traceback if settings.DEBUG else "",
                } for e in r.errors],
                "validation_error": r.validation_error,
                "warnings": r.warnings,
                "diff": r.diff,
                "import_type": r.import_type,
            } for r in result.rows],  # TODO
        })

    @action(detail=False, methods=["post"])
    def template_submit(self, request):
        """
        Submits a template action. Should be done only after an initial check,
        since this endpoint does not return any helpful error messages. Will
        save any submitted data to the database unless an error occurs.
        """

        error, action_data = self._get_action(request)
        if error:
            return HttpResponseBadRequest(json.dumps({"detail": action_data}), content_type="application/json")

        action_def, dataset = action_data

        resource_instance = action_def["resource"]()
        result = resource_instance.import_data(dataset)

        if result.has_errors() or result.has_validation_errors():
            # TODO: Better message
            return HttpResponseBadRequest(json.dumps({"detail": "Template errors encountered in submission"}),
                                          content_type="application/json")

        return Response(status=204)


def _prefix_keys(prefix: str, d: Dict[str, Any]) -> Dict[str, Any]:
    return {prefix + k: v for k, v in d.items()}

def _list_keys(d: Dict[str, Any]) -> Dict[str, Any]:
    return [k  for k, v in d.items()]


FiltersetFields = Dict[str, List[str]]


_container_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": FREE_TEXT_FILTERS,
    "barcode": FREE_TEXT_FILTERS,
    "kind": CATEGORICAL_FILTERS,
    "coordinates": FREE_TEXT_FILTERS,
    "comment": FREE_TEXT_FILTERS,
    "update_comment": FREE_TEXT_FILTERS,
    "location": NULLABLE_FK_FILTERS,
}

_individual_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "taxon": CATEGORICAL_FILTERS,
    "sex": CATEGORICAL_FILTERS,
    "pedigree": CATEGORICAL_FILTERS_LOOSE,
    "cohort": CATEGORICAL_FILTERS_LOOSE,

    "mother": NULLABLE_FK_FILTERS,
    "father": NULLABLE_FK_FILTERS,
}

_user_filterset_fields: FiltersetFields = {
    "username": FREE_TEXT_FILTERS,
    "email": FREE_TEXT_FILTERS,
}

_group_filterset_fields: FiltersetFields = {
    "name": FREE_TEXT_FILTERS,

}

_sample_kind_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_sample_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "sample_kind": FK_FILTERS,
    "volume": SCALAR_FILTERS,
    "concentration": SCALAR_FILTERS,
    "depleted": ["exact"],
    "collection_site": CATEGORICAL_FILTERS_LOOSE,
    "tissue_source": CATEGORICAL_FILTERS,
    "creation_date": DATE_FILTERS,
    "coordinates": FREE_TEXT_FILTERS,
    "comment": FREE_TEXT_FILTERS,
    "update_comment": FREE_TEXT_FILTERS,

    "individual": FK_FILTERS,  # PK
    "container": FK_FILTERS,  # PK
    **_prefix_keys("sample_kind__", _sample_kind_filterset_fields),
    **_prefix_keys("container__", _container_filterset_fields),
    **_prefix_keys("individual__", _individual_filterset_fields),
}

_sample_minimal_filterset_fields: FiltersetFields = {
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_protocol_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_process_measurement_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "source_sample": FK_FILTERS,
    "execution_date": DATE_FILTERS,
    "volume_used": SCALAR_FILTERS,
    "comment": FREE_TEXT_FILTERS,
    "process": FK_FILTERS,
    **_prefix_keys("process__protocol__", _protocol_filterset_fields),
    **_prefix_keys("source_sample__", _sample_minimal_filterset_fields),
    **_prefix_keys("lineage__child__", _sample_minimal_filterset_fields),
}

class ContainerViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Container.objects.select_related("location").prefetch_related("children", "samples").all()
    serializer_class = ContainerSerializer
    filterset_fields = {
        **_container_filterset_fields,
        **_prefix_keys("location__", _container_filterset_fields),
        **_prefix_keys("samples__", _sample_minimal_filterset_fields),
    }

    template_action_list = [
        {
            "name": "Add Containers",
            "description": "Upload the provided template with up to 100 new containers.",
            "template": CONTAINER_CREATION_TEMPLATE,
            "resource": ContainerResource,
        },
        {
            "name": "Move Containers",
            "description": "Upload the provided template with up to 100 containers to move.",
            "template": CONTAINER_MOVE_TEMPLATE,
            "resource": ContainerMoveResource,
        },
        {
            "name": "Rename Containers",
            "description": "Upload the provided template with up to 384 containers to rename.",
            "template": CONTAINER_RENAME_TEMPLATE,
            "resource": ContainerRenameResource,
        },
    ]

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
        search_input = _request.GET.get("q")
        is_parent = _request.GET.get("parent") == 'true'
        is_sample_holding = _request.GET.get("sample_holding") == 'true'

        query = Q(name__icontains=search_input)
        query.add(Q(id__icontains=search_input), Q.OR)
        if is_parent:
            query.add(Q(kind__in=PARENT_CONTAINER_KINDS), Q.AND)
        if is_sample_holding:
            query.add(Q(kind__in=SAMPLE_CONTAINER_KINDS), Q.AND)

        containers_data = Container.objects.filter(query)
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

    @action(detail=True, methods=["get"])
    def list_samples(self, _request, pk=None):
        """
        Lists all samples stored in a given container.
        """
        samples = Container.objects.get(pk=pk).samples
        serializer = SampleSerializer(samples, many=True)
        return Response(serializer.data)

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        """
        Lists all django_reversion Version objects associated with a container.
        """
        return versions_detail(self.get_object())


class SampleKindViewSet(viewsets.ModelViewSet):
    queryset = SampleKind.objects.all()
    serializer_class = SampleKindSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

class ProtocolViewSet(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

class ProcessMeasurementViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = ProcessMeasurement.objects.all().select_related("process").prefetch_related("lineage")
    queryset = queryset.annotate(child_sample=F("lineage__child"))
    queryset = queryset.annotate(child_sample_name=F("lineage__child__name"))
    queryset = queryset.annotate(source_sample_name=F("source_sample__name"))

    serializer_class = ProcessMeasurementSerializer

    ordering_fields = (
        *_list_keys(_process_measurement_filterset_fields),
    )

    filterset_fields = {
        **_process_measurement_filterset_fields,
    }

    template_action_list = [
        {
            "name": "Process Extractions",
            "description": "Upload the provided template with extraction information.",
            "template": SAMPLE_EXTRACTION_TEMPLATE,
            "resource": ExtractionResource,
        },
        {
            "name": "Process Transfers",
            "description": "Upload the provided template with samples to be transfered.",
            "template": SAMPLE_TRANSFER_TEMPLATE,
            "resource": TransferResource,
        },
    ]

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = ProcessMeasurementExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = ProcessMeasurementExportSerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for process sample that match the given query
        """
        search_input = _request.GET.get("q")

        query = Q(id__icontains=search_input)

        process_measurement_data = ProcessMeasurement.objects.filter(query)
        page = self.paginate_queryset(process_measurement_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of ProcessMeasurement in the
        database.
        """

        return Response({
            "total_count": ProcessMeasurement.objects.all().count(),
            "protocol_counts": {
                c["process__protocol"]: c["process__protocol__count"]
                for c in self.queryset.values("process__protocol").annotate(Count("process__protocol"))
            },
        })

class SampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Sample.objects.select_related("individual", "container", "sample_kind").prefetch_related("process_measurement").all()
    ordering_fields = (
        *_list_keys(_sample_filterset_fields),
    )

    filterset_fields = {
        **_sample_filterset_fields,
    }

    template_action_list = [
        {
            "name": "Add Samples",
            "description": "Upload the provided template with up to 384 new samples.",
            "template": SAMPLE_SUBMISSION_TEMPLATE,
            "resource": SampleResource,
        },
        {
            "name": "Update Samples",
            "description": "Upload the provided template with up to 384 samples to update.",
            "template": SAMPLE_UPDATE_TEMPLATE,
            "resource": SampleUpdateResource,
        }
    ]

    def get_queryset(self):
        recursive = self.request.query_params.get("recursive", False)
        if recursive:
            container = self.request.query_params.get('container_id')

            parent_containers = Container.objects.raw('''WITH RECURSIVE parent(id, location_id) AS (
                                                               SELECT id, location_id
                                                               FROM fms_core_container
                                                               WHERE id = %s

                                                               UNION ALL

                                                               SELECT child.id, child.location_id
                                                               FROM fms_core_container AS child, parent
                                                               WHERE child.location_id = parent.id
                                                           )
                                                           SELECT * FROM parent''', [container])

            return self.queryset.filter(container__in=parent_containers)

        return self.queryset



    def get_serializer_class(self):
        # If the nested query param is passed in with a non-false-y string
        # value, use the nested sample serializer; this will nest referenced
        # objects 1 layer deep to provide more data in a single request.

        nested = self.request.query_params.get("nested", False)
        if nested:
            return NestedSampleSerializer
        return SampleSerializer

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = SampleExportSerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = SampleExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def list_collection_sites(self, _request):
        samples_data = Sample.objects.filter().distinct("collection_site")
        collection_sites = [s.collection_site for s in samples_data]
        return Response(collection_sites)

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for samples that match the given query
        """
        search_input = _request.GET.get("q")

        query = Q(name__icontains=search_input)
        query.add(Q(alias__icontains=search_input), Q.OR)
        query.add(Q(id__icontains=search_input), Q.OR)

        samples_data = Sample.objects.filter(query)
        page = self.paginate_queryset(samples_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of samples in the
        database.
        """

        experimental_groups = Counter()
        for eg in Sample.objects.values_list("experimental_group", flat=True):
            experimental_groups.update(eg)


        return Response({
            "total_count": Sample.objects.all().count(),
            "kinds_counts": {
                c["sample_kind"]: c["sample_kind__count"]
                for c in Sample.objects.values("sample_kind").annotate(Count("sample_kind"))
            },
            "tissue_source_counts": {
                c["tissue_source"]: c["tissue_source__count"]
                for c in Sample.objects.values("tissue_source").annotate(Count("tissue_source"))
            },
            "collection_site_counts": {
                c["collection_site"]: c["collection_site__count"]
                for c in Sample.objects.values("collection_site").annotate(Count("collection_site"))
            },
            "experimental_group_counts": dict(experimental_groups),
        })

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, _request, pk=None):
        return versions_detail(self.get_object())


class IndividualViewSet(viewsets.ModelViewSet):
    queryset = Individual.objects.all()
    serializer_class = IndividualSerializer
    filterset_fields = _individual_filterset_fields

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = IndividualSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for individuals that match the given query
        """
        search_input = _request.GET.get("q")

        query = Q(id__icontains=search_input)
        query.add(Q(name__icontains=search_input), Q.OR)

        individuals_data = Individual.objects.filter(query)
        page = self.paginate_queryset(individuals_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

class FZY(Func):
    template = "%(function)s('%(search_term)s', %(expressions)s::cstring)"
    function = "fzy"

    def __init__(self, expression, search_term, **extras):
        super(FZY, self).__init__(
            expression,
            search_term=search_term,
            **extras
        )

# noinspection PyMethodMayBeStatic,PyUnusedLocal
class QueryViewSet(viewsets.ViewSet):
    basename = "query"

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.GET.get("q")

        if not query:
            return Response([])

        def serialize(s) -> dict:
            item_type = s["type"]
            s["score"] = s["item"].score
            if item_type == Container:
                s["type"] = "container"
                s["item"] = ContainerSerializer(s["item"]).data
                return s
            if item_type == Sample:
                s["type"] = "sample"
                s["item"] = SampleSerializer(s["item"]).data
                return s
            if item_type == Individual:
                s["type"] = "individual"
                s["item"] = IndividualSerializer(s["item"]).data
                return s
            if item_type == User:
                s["type"] = "user"
                s["item"] = UserSerializer(s["item"]).data
                return s
            raise ValueError("unreachable")

        def query_and_score(model, fields):
            scores = list(map(lambda f: FZY(F(f), query), fields))
            scores = scores[0] if len(scores) == 1 else Greatest(*scores)
            return [{
                "type": model,
                "item": s
            } for s in model.objects
                .annotate(
                    score=scores
                )
                .filter(score__gt=0)
                .order_by('-score')[:100]
            ]

        containers = query_and_score(Container, ["name"])
        individuals = query_and_score(Individual, ["name"])
        samples = query_and_score(Sample, ["name"])
        users = query_and_score(User, ["username", "first_name", "last_name"])

        results = containers + individuals + samples + users
        results.sort(key=lambda c: c["item"].score, reverse=True)
        data = map(serialize, results[:100])

        return Response(data)


class VersionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Version.objects.all().prefetch_related("content_type", "revision")
    serializer_class = VersionSerializer
    filterset_fields = {
        "object_id": FK_FILTERS,

        # Content type filters
        "content_type__id": FK_FILTERS,
        "content_type__app_label": CATEGORICAL_FILTERS,
        "content_type__model": CATEGORICAL_FILTERS,

        # Revision filters
        "revision__id": FK_FILTERS,
        "revision__date_created": DATE_FILTERS,
        "revision__user": ["exact"],
    }


class RevisionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Revision.objects.all()
    serializer_class = RevisionSerializer
    filterset_fields = {
        "user_id": FK_FILTERS,
    }


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filterset_fields = _user_filterset_fields

    def get_permissions(self):
        if self.action == "update_self":
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [DjangoModelPermissions]
        return [permission() for permission in permission_classes]

    def partial_update(self, request, *args, **kwargs):
        instance = self.queryset.get(pk=kwargs.get("pk"))
        password = request.data.pop("password", None)
        serializer = self.serializer_class(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if password is not None:
            user.set_password(password)
            user.save()
        return Response(serializer.data)

    @action(detail=False, methods=["patch"])
    def update_self(self, request):
        """
        Updates the user's own data, excluding permission fields
        """
        data = request.data
        restricted_fields = ["groups", "is_staff", "is_superuser", "username", "email"]
        if any([field in data for field in restricted_fields]):
            return Response({
                "ok": False,
                "detail": "Forbidden field",
            }, status=status.HTTP_403_FORBIDDEN)

        user_id = request.user.id
        data["id"] = user_id
        password = data.pop("password", None)
        instance = self.queryset.get(pk=user_id)
        serializer = self.serializer_class(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if password is not None:
            user.set_password(password)
            user.save()
        return Response(serializer.data)


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    filterset_fields = _group_filterset_fields
