from xml.dom import ValidationErr

from django.forms import ValidationError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.services.index import validate_indices
from fms_core.models import Index, IndexSet, InstrumentType
from fms_core.serializers import IndexSerializer, IndexExportSerializer, IndexSetSerializer
from fms_core.template_importer.importers import IndexCreationImporter
from fms_core.templates import INDEX_CREATION_TEMPLATE

from ._utils import TemplateActionsMixin, _list_keys
from ._constants import _index_filterset_fields

from fms_core.filters import IndexFilter

from collections import defaultdict


class IndexViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Index.objects.all()
    serializer_class = IndexSerializer
    filter_class = IndexFilter

    ordering_fields = (
        *_list_keys(_index_filterset_fields),
    )

    template_action_list = [
        {
            "name": "Add indices",
            "description": "Upload the provided template with a list of indices grouped by set.",
            "template": [INDEX_CREATION_TEMPLATE["identity"]],
            "importer": IndexCreationImporter,
        }
    ]

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = IndexExportSerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = IndexExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def validate(self, _request):
        form_errors = defaultdict(list)
        indices = []
        errors = []
        warnings = []
        results = {}
        
        indices_ids = [int(id) for id in _request.GET.get("indices", "").split(",")]
        for index_id in indices_ids:
            try:
                indices.append(Index.objects.get(id=index_id))
            except Index.DoesNotExist:
                form_errors["indices"].append(f"Index with id {index_id} does not exist.")
                
        instrument_type_id = int(_request.GET.get("instrument_type", -1)) # defaults to an invalid id
        try:
            instrument_type = InstrumentType.objects.get(id=instrument_type_id)
        except InstrumentType.DoesNotExist:
            form_errors["instrument_type"].append(f"Instrument type with id {instrument_type_id} does not exist.")
        
        length_5prime = int(_request.GET.get("length_5prime", 0))
        if length_5prime < 0:
            form_errors["length_5prime"].append(f"Validation length for index at 5 prime end cannot be negative.")
        length_3prime = int(_request.GET.get("length_3prime", 0))
        if length_3prime < 0:
            form_errors["length_3prime"].append(f"Validation length for index at 3 prime end cannot be negative.")

        threshold = _request.GET.get("threshold", None)
        threshold = threshold if threshold is None else int(threshold)
        if threshold and threshold < 0:
            form_errors["threshold"].append(f"Distance threshold cannot be negative.")
        if not form_errors:
            results, errors, warnings = validate_indices(indices, instrument_type, length_5prime, length_3prime, threshold)
        else:
            raise ValidationError(form_errors)
        data = {"form_errors": ValidationError(form_errors),
                "validation_errors": ValidationError(errors),
                "warnings": warnings,
                "results": results}
        return Response(data)

    @action(detail=False, methods=["get"])
    def list_sets(self, _request):
        serializer = IndexSetSerializer(IndexSet.objects.all(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of projects in the
        database.
        """
        return Response({
            "total_count": Index.objects.count(),
        })