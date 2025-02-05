from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, When, Count, Case, BooleanField, CharField, F, OuterRef, Subquery, IntegerField
from collections import Counter, defaultdict

from fms_core.filters import LibraryFilter
from fms_core.models import Sample, Container, DerivedBySample, LibraryType, Library
from fms_core.serializers import LibrarySerializer, LibraryExportSerializer

from fms_core.templates import ( EXPERIMENT_MGI_TEMPLATE,
                                 EXPERIMENT_ILLUMINA_TEMPLATE,
                                 LIBRARY_CAPTURE_TEMPLATE,
                                 LIBRARY_CONVERSION_TEMPLATE,
                                 LIBRARY_QC_TEMPLATE,
                                 NORMALIZATION_PLANNING_TEMPLATE,
                                 NORMALIZATION_TEMPLATE,
                                 SAMPLE_POOLING_TEMPLATE )
from fms_core.template_importer.importers import ( ExperimentRunImporter,
                                                   LibraryCaptureImporter,
                                                   LibraryConversionImporter,
                                                   LibraryQCImporter,
                                                   NormalizationPlanningImporter,
                                                   NormalizationImporter,
                                                   SamplePoolingImporter )

from ._utils import TemplateActionsMixin, TemplatePrefillsMixin, _list_keys
from ._fetch_data import FetchLibraryData
from ._constants import _library_filterset_fields

class LibraryViewSet(viewsets.ModelViewSet, TemplateActionsMixin, TemplatePrefillsMixin, FetchLibraryData):
    queryset = Sample.objects.all()
    serializer_class = LibrarySerializer

    ordering_fields = (
        *_list_keys(_library_filterset_fields),
        "quantity_ng",
        "qc_flag"
    )

    filterset_fields = {
        **_library_filterset_fields,
    }

    ordering = ["-id"]

    filterset_class = LibraryFilter

    template_action_list = [
        {
            "name": "Add Experiments",
            "description": "Upload the provided template with experiment run information.",
            "template": [EXPERIMENT_ILLUMINA_TEMPLATE['identity'], EXPERIMENT_MGI_TEMPLATE['identity']],
            "importer": ExperimentRunImporter,
        },
        {
            "name": "Capture Libraries",
            "description": "Upload the provided template with libraries or pooled libraries to capture.",
            "template": [LIBRARY_CAPTURE_TEMPLATE["identity"]],
            "importer": LibraryCaptureImporter,
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
            "name": "Normalize Libraries",
            "description": "Upload the provided template with information to normalize libraries.",
            "template": [NORMALIZATION_TEMPLATE["identity"]],
            "importer": NormalizationImporter,
        },
        {
            "name": "Perform Normalization Planning",
            "description": "Upload the provided template with normalization information to populate normalization template and the robot file.",
            "template": [NORMALIZATION_PLANNING_TEMPLATE["identity"]],
            "importer": NormalizationPlanningImporter,
        },
        {
            "name": "Pool Libraries",
            "description": "Upload the provided template with information to pool libraries.",
            "template": [SAMPLE_POOLING_TEMPLATE["identity"]],
            "importer": SamplePoolingImporter,
        },
    ]

    template_prefill_list = [
        {"template": EXPERIMENT_MGI_TEMPLATE},
        {"template": EXPERIMENT_ILLUMINA_TEMPLATE},
        {"template": LIBRARY_CAPTURE_TEMPLATE},
        {"template": LIBRARY_CONVERSION_TEMPLATE},
        {"template": LIBRARY_QC_TEMPLATE},
        {"template": NORMALIZATION_PLANNING_TEMPLATE},
        {"template": NORMALIZATION_TEMPLATE},
        {"template": SAMPLE_POOLING_TEMPLATE}
    ]

    def get_queryset(self):
        self.queryset = Sample.objects.select_related("container").filter(derived_samples__library__isnull=False).all().distinct()
        self.queryset = self.queryset.annotate(
            qc_flag=Case(
                When(Q(quality_flag=False) | Q(quantity_flag=False), then=False),
                When(Q(quality_flag=True) | Q(quantity_flag=True), then=True),
                default=None,
                output_field=BooleanField()
            )
        )
        self.queryset = self.queryset.annotate(
            count_derived_samples=Count("derived_samples")
        )
        self.queryset = self.queryset.annotate(
            quantity_ng=F('concentration')*F('volume')
        )
        self.queryset = self.queryset.annotate(
            first_volume_ratio=Subquery(
                DerivedBySample.objects
                .filter(sample=OuterRef("pk"))
                .values_list("volume_ratio", flat=True)[:1]
            )
        )
        self.queryset = self.queryset.annotate(
            first_project_id=Subquery(
                DerivedBySample.objects
                .filter(sample=OuterRef("pk"))
                .values_list("project_id", flat=True)[:1]
            )
        )
        self.queryset = self.queryset.annotate(
            is_pooled=Case(
                When(Q(first_volume_ratio__lt=1) | Q(count_derived_samples__gt=1), then=True),
                default=False,
                output_field=BooleanField()
            )
        )
        self.queryset = self.queryset.annotate(
            sample_strandedness=Case(
                When(Q(is_pooled__exact=True), then=None),
                When(Q(is_pooled__exact=False), then=F('derived_samples__library__strandedness')),
                default=None,
                output_field=CharField())
        )
        self.queryset = self.queryset.annotate(
            first_derived_sample=Subquery(
                DerivedBySample.objects
                .filter(sample=OuterRef("pk"))
                .values_list("derived_sample", flat=True)[:1]
            )
        )

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

    def retrieve(self, _request, pk=None, *args, **kwargs):
        self.queryset = self.filter_queryset(self.get_queryset())
        serialized_data, _ = self.fetch_data([pk] if pk is not None else [])
        return Response(serialized_data[0] if serialized_data else {})

    def list(self, _request, *args, **kwargs):
        self.queryset = self.filter_queryset(self.get_queryset())
        serialized_data, count = self.fetch_data()
        return Response({"results": serialized_data, "count": count})

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        self.queryset = self.filter_queryset(self.get_queryset())
        serialized_data = self.fetch_export_data()
        return Response(serialized_data)

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
        self.queryset = self.filter_queryset(self.get_queryset())
        pooled_libraries = self.queryset.filter(is_pooled=True).values('id')
        count_pooled = pooled_libraries.count()
        non_pooled_libraries = self.queryset.filter(is_pooled=False)
        count_unpooled = non_pooled_libraries.count()

        total_count = count_pooled + count_unpooled

        library_type_counts = defaultdict(int)
        for item in non_pooled_libraries.values("id", "derived_samples__library__library_type"):
            library_type = item["derived_samples__library__library_type"]
            library_type_counts[library_type] += 1

        return Response({
            "total_count": total_count,
            "library_type_counts": library_type_counts,
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

        self.queryset = self.get_queryset().filter(query)
        serialized_data, count = self.fetch_data()
        return Response({"results": serialized_data, "count": count})


