from collections import Counter

from django.db.models import Count, Q, F

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import Sample, Container

from fms_core.serializers import SampleSerializer, SampleExportSerializer, NestedSampleSerializer
from fms_core.template_importer.importers import SampleSubmissionImporter

from fms_core.resources import SampleResource, SampleUpdateResource
from fms_core.template_paths import SAMPLE_SUBMISSION_TEMPLATE, SAMPLE_UPDATE_TEMPLATE

from ._utils import TemplateActionsMixin, _list_keys, versions_detail
from ._constants import _sample_filterset_fields


class SampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Sample.objects.select_related("individual", "container", "sample_kind").prefetch_related("process_measurement", "projects").all().distinct()

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
            "importer": SampleSubmissionImporter,
        },
        {
            "name": "Update Samples",
            "description": "Upload the provided template with up to 384 samples to update.",
            "template": SAMPLE_UPDATE_TEMPLATE,
            "resource": SampleUpdateResource,
        }
    ]

    def get_queryset(self):
        container_barcode = self.request.query_params.get('container__barcode__recursive')
        container_name = self.request.query_params.get('container__name__recursive')
        recursive = container_barcode or container_name

        if recursive:
            containers = Container.objects.all()
            if container_barcode:
                containers = containers.filter(barcode=container_barcode)
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