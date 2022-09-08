import json
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, When, Count, Case, BooleanField, F

from fms_core.models import Sample, Container
from fms_core.serializers import LibrarySerializer, LibraryExportSerializer

from fms_core.templates import EXPERIMENT_MGI_TEMPLATE, LIBRARY_CONVERSION_TEMPLATE, LIBRARY_QC_TEMPLATE, NORMALIZATION_PLANNING_TEMPLATE, NORMALIZATION_TEMPLATE
from fms_core.template_importer.importers import ExperimentRunImporter, LibraryConversionImporter, LibraryQCImporter, NormalizationPlanningImporter, NormalizationImporter

from ._utils import TemplateActionsMixin, TemplatePrefillsMixin, _list_keys
from ._constants import _library_filterset_fields
from fms_core.filters import LibraryFilter

class LibraryViewSet(viewsets.ModelViewSet, TemplateActionsMixin, TemplatePrefillsMixin):
    queryset = Sample.objects.select_related("container").filter(derived_samples__library__isnull=False).all().distinct()
    queryset = queryset.annotate(
        qc_flag=Case(
            When(Q(quality_flag=True) & Q(quantity_flag=True), then=True),
            When(Q(quality_flag=False) | Q(quantity_flag=False), then=False),
            default=None,
            output_field=BooleanField())
    )
    queryset = queryset.annotate(
        sample_strandedness=F('derived_samples__library__strandedness')
    )
    serializer_class = LibrarySerializer

    ordering_fields = (
        *_list_keys(_library_filterset_fields),
    )

    filterset_fields = {
        **_library_filterset_fields,
    }

    filter_class = LibraryFilter

    template_action_list = [
        {
            "name": "Add Experiments",
            "description": "Upload the provided template with experiment run information.",
            "template": [EXPERIMENT_MGI_TEMPLATE["identity"]],
            "importer": ExperimentRunImporter,
        },
        {
            "name": "Convert Libraries",
            "description": "Upload the provided template with libraries to convert.",
            "template": [LIBRARY_CONVERSION_TEMPLATE["identity"]],
            "importer": LibraryConversionImporter,
        },
        {
            "name": "Library Quality Control",
            "description": "Upload the provided template with libraries that underwent a quality control.",
            "template": [LIBRARY_QC_TEMPLATE["identity"]],
            "importer": LibraryQCImporter,
        },
        {
            "name": "Perform Normalization Planning",
            "description": "Upload the provided template with normalization information to populate normalization template and the robot file.",
            "template": [NORMALIZATION_PLANNING_TEMPLATE["identity"]],
            "importer": NormalizationPlanningImporter,
        },
        {
            "name": "Normalize Libraries",
            "description": "Upload the provided template with information to normalize libraries.",
            "template": [NORMALIZATION_TEMPLATE["identity"]],
            "importer": NormalizationImporter,
        },
    ]

    template_prefill_list = [
        {"template": EXPERIMENT_MGI_TEMPLATE},
        {"template": LIBRARY_CONVERSION_TEMPLATE},
        {"template": LIBRARY_QC_TEMPLATE},
        {"template": NORMALIZATION_PLANNING_TEMPLATE},
        {"template": NORMALIZATION_TEMPLATE}
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

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = LibraryExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = LibraryExportSerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of libraries in the
        database.
        """
        return Response({
            "total_count": self.get_queryset().all().count(),
            "library_type_counts": {
                 c["derived_samples__library__library_type"]: c["derived_samples__library__library_type__count"]
                 for c in self.queryset.values("derived_samples__library__library_type").annotate(Count("derived_samples__library__library_type"))
            },
        })

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for libraries that match the given query
        """
        search_input = _request.GET.get("q")
        is_exact_match = _request.GET.get("exact_match") == 'true'

        if is_exact_match:
            query = Q(name=search_input)
            query.add(Q(id=search_input), Q.OR)
        else:
            query = Q(name__icontains=search_input)
            query.add(Q(id__icontains=search_input), Q.OR)

        full_library_data = self.get_queryset().filter(query)
        page = self.paginate_queryset(full_library_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


