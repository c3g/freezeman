from collections import Counter

from django.db.models import Count, Q, F

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import Sample, Container, DerivedSample, Biosample

from fms_core.serializers import SampleSerializer, SampleExportSerializer
from fms_core.template_importer.importers import SampleSubmissionImporter, SampleUpdateImporter

from fms_core.template_paths import SAMPLE_SUBMISSION_TEMPLATE, SAMPLE_UPDATE_TEMPLATE

from ._utils import TemplateActionsMixin, _list_keys, versions_detail
from ._constants import _sample_filterset_fields


class SampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Sample.objects.select_related("container").prefetch_related("process_measurement", "projects").all().distinct()
    serializer_class = SampleSerializer

    ordering_fields = (
        *_list_keys(_sample_filterset_fields),
    )

    filterset_fields = {
        **_sample_filterset_fields,
    }

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = SampleExportSerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, _request, pk=None):
        return versions_detail(self.get_object())

