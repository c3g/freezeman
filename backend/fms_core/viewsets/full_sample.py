from collections import Counter

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q, F

from fms_core.models import FullSample, Biosample, Sample, DerivedSample
from fms_core.serializers import FullSampleSerializer, FullSampleExportSerializer
from fms_core.template_importer.importers import SampleSubmissionImporter, SampleUpdateImporter

from fms_core.template_paths import SAMPLE_SUBMISSION_TEMPLATE, SAMPLE_UPDATE_TEMPLATE

from ._constants import _full_sample_filterset_fields
from ._utils import TemplateActionsMixin, _list_keys, versions_detail

class FullSampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = FullSample.objects.select_related("individual", "container", "sample_kind", "biosample", "derived_sample").all()
    serializer_class = FullSampleSerializer

    ordering_fields = (
        *_list_keys(_full_sample_filterset_fields),
    )

    filterset_fields = {
        **_full_sample_filterset_fields,
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
            "importer": SampleUpdateImporter,
        }
    ]

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = FullSampleExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of samples in the
        database.
        """

        experimental_groups = Counter()
        for eg in DerivedSample.objects.values_list("experimental_group", flat=True):
            experimental_groups.update(eg)

        return Response({
            "total_count": Sample.objects.all().count(),
            "kinds_counts": {
                c["sample_kind"]: c["sample_kind__count"]
                for c in DerivedSample.objects.values("sample_kind").annotate(Count("sample_kind"))
            },
            "tissue_source_counts": {
                c["tissue_source"]: c["tissue_source__count"]
                for c in DerivedSample.objects.values("tissue_source").annotate(Count("tissue_source"))
            },
            "collection_site_counts": {
                c["collection_site"]: c["collection_site__count"]
                for c in Biosample.objects.values("collection_site").annotate(Count("collection_site"))
            },
            "experimental_group_counts": dict(experimental_groups),
        })

    @action(detail=False, methods=["get"])
    def list_collection_sites(self, _request):
        samples_data = Biosample.objects.filter().distinct("collection_site")
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