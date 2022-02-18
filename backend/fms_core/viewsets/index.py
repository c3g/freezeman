from xml.dom import ValidationErr

from django.forms import ValidationError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import Index
from fms_core.services.index import validate_indices
from fms_core.serializers import IndexSerializer, IndexExportSerializer
from fms_core.template_importer.importers import IndexCreationImporter
from fms_core.templates import INDEX_CREATION_TEMPLATE

from ._utils import TemplateActionsMixin, _list_keys
from ._constants import _index_filterset_fields

from fms_core.filters import IndexFilter


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
        indices_ids = _request.GET.get("indices", "").split(",")
        instrument_type_id = _request.GET.get("instrument_type", -1) # defaults to an invalid id
        length_5prime = _request.GET.get("5prime_length", 0)
        length_3prime = _request.GET.get("3prime_length", 0)
        threshold = _request.GET.get("threshold", None)
        results, errors, warnings = validate_indices(indices_ids, instrument_type_id, length_5prime, length_3prime, threshold)
        data = {"validation_errors": ValidationError(errors),
                "warnings": warnings,
                "results": results}
        return Response(data)

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of projects in the
        database.
        """
        return Response({
            "total_count": Index.objects.count(),
        })