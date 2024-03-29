from django.db.models import Q, F, Count
from django.forms import ValidationError

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import ProcessMeasurement
from fms_core.serializers import ProcessMeasurementSerializer, ProcessMeasurementExportSerializer, ProcessMeasurementWithPropertiesExportSerializer
from fms_core.template_importer.importers import ExtractionImporter, TransferImporter
from fms_core.templates import SAMPLE_EXTRACTION_TEMPLATE, SAMPLE_TRANSFER_TEMPLATE

from ._utils import TemplateActionsMixin, _list_keys
from ._constants import _process_measurement_filterset_fields


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

    ordering = ["-id"]

    template_action_list = [
        {
            "name": "Process Extractions",
            "description": "Upload the provided template with extraction information.",
            "template": [SAMPLE_EXTRACTION_TEMPLATE["identity"]],
            "importer": ExtractionImporter,
        },
        {
            "name": "Process Transfers",
            "description": "Upload the provided template with samples to be transfered.",
            "template": [SAMPLE_TRANSFER_TEMPLATE["identity"]],
            "importer": TransferImporter,
        },
    ]

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        queryset = self.filter_queryset(self.get_queryset())
        try: 
            serializer = self.get_serializer_class()(queryset, many=True)
        except Exception as err:
            raise ValidationError(err)
        return Response(serializer.data)

    def get_serializer_class(self):
        if self.action == "list_export":
            queryset = self.filter_queryset(self.get_queryset())
            if queryset.values("process__protocol").distinct().count() == 1:
                return ProcessMeasurementWithPropertiesExportSerializer
            else:
                return ProcessMeasurementExportSerializer
        else:
            return ProcessMeasurementSerializer

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = self.get_serializer_class().Meta.fields
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