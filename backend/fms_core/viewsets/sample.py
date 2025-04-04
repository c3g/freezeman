from collections import defaultdict
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, When, Case, BooleanField, Prefetch, Count, Subquery, OuterRef
from django.core.exceptions import ValidationError
from django.db import transaction

from ..utils import RE_SEPARATOR

from fms_core.models import Sample, Container, Biosample, DerivedSample, DerivedBySample, SampleMetadata, Coordinate, Project
from fms_core.serializers import SampleSerializer, SampleExportSerializer
from fms_core.services.project import add_sample_to_study

from fms_core.template_importer.importers import SampleSubmissionImporter, SampleUpdateImporter, SampleQCImporter, SampleMetadataImporter, SamplePoolingImporter
from fms_core.template_importer.importers import SampleSelectionQPCRImporter, LibraryPreparationImporter, ExperimentRunImporter, NormalizationImporter, NormalizationPlanningImporter
from fms_core.template_importer.importers import AxiomPreparationImporter

from fms_core.templates import SAMPLE_POOLING_TEMPLATE, SAMPLE_SUBMISSION_TEMPLATE, SAMPLE_UPDATE_TEMPLATE, SAMPLE_QC_TEMPLATE, LIBRARY_PREPARATION_TEMPLATE
from fms_core.templates import PROJECT_STUDY_LINK_SAMPLES_TEMPLATE, SAMPLE_EXTRACTION_TEMPLATE, SAMPLE_TRANSFER_TEMPLATE, SAMPLE_SELECTION_QPCR_TEMPLATE, SAMPLE_METADATA_TEMPLATE, NORMALIZATION_TEMPLATE
from fms_core.templates import EXPERIMENT_INFINIUM_TEMPLATE, EXPERIMENT_AXIOM_TEMPLATE, NORMALIZATION_PLANNING_TEMPLATE, AXIOM_PREPARATION_TEMPLATE

from ._utils import TemplateActionsMixin, TemplatePrefillsMixin, _list_keys, versions_detail
from ._fetch_data import FetchSampleData
from ._constants import _sample_filterset_fields
from fms_core.filters import SampleFilter

class SampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin, TemplatePrefillsMixin, FetchSampleData):
    queryset = Sample.objects.none() # Should not be called directly
    serializer_class = SampleSerializer

    ordering_fields = (
        *_list_keys(_sample_filterset_fields),
        "qc_flag"
    )

    ordering = ["-id"]

    filterset_fields = {
        **_sample_filterset_fields,
    }

    filterset_class = SampleFilter

    template_action_list = [
        {
            "name": "Add Samples",
            "description": "Upload the provided template with up to 384 new samples.",
            "template": [SAMPLE_SUBMISSION_TEMPLATE["identity"]],
            "importer": SampleSubmissionImporter,
        },
        {
            "name": "Update Samples",
            "description": "Upload the provided template with up to 384 samples to update.",
            "template": [SAMPLE_UPDATE_TEMPLATE["identity"]],
            "importer": SampleUpdateImporter,
        },
        {
            "name": "Sample Quality Control",
            "description": "Upload the provided template with samples that underwent a quality control.",
            "template": [SAMPLE_QC_TEMPLATE["identity"]],
            "importer": SampleQCImporter,
        },
        {
            "name": "Sample Selection Using qPCR",
            "description": "Upload the provided template with samples to perform a sample selection using qPCR.",
            "template": [SAMPLE_SELECTION_QPCR_TEMPLATE["identity"]],
            "importer": SampleSelectionQPCRImporter,
        },
        {
            "name": "Prepare Libraries",
            "description": "Upload the provided template with information to prepare libraries with the possibility to group them by batch.",
            "template": [LIBRARY_PREPARATION_TEMPLATE["identity"]],
            "importer": LibraryPreparationImporter,
        },
        {
            "name": "Add Experiments",
            "description": "Upload the provided template with experiment run information.",
            "template": [EXPERIMENT_INFINIUM_TEMPLATE["identity"], EXPERIMENT_AXIOM_TEMPLATE["identity"]],
            "importer": ExperimentRunImporter,
        },
        {
            "name": "Add Metadata to Samples",
            "description": "Upload the provided template with custom metadata to be added to samples.",
            "template": [SAMPLE_METADATA_TEMPLATE["identity"]],
            "importer": SampleMetadataImporter,
        },
        {
            "name": "Perform Normalization Planning",
            "description": "Upload the provided template with normalization information to populate normalization template and the robot file.",
            "template": [NORMALIZATION_PLANNING_TEMPLATE["identity"]],
            "importer": NormalizationPlanningImporter,
        },
        {
            "name": "Normalize Samples or Libraries",
            "description": "Upload the provided template with information to normalize samples or libraries.",
            "template": [NORMALIZATION_TEMPLATE["identity"]],
            "importer": NormalizationImporter,
        },
        {
            "name": "Pool Samples or Libraries",
            "description": "Upload the provided template with information to pool samples or libraries.",
            "template": [SAMPLE_POOLING_TEMPLATE["identity"]],
            "importer": SamplePoolingImporter,
        },
        {
            "name": "Prepare Samples for Axiom Genotyping",
            "description": "Upload the provided template with information to prepare samples Axiom genotyping.",
            "template": [AXIOM_PREPARATION_TEMPLATE["identity"]],
            "importer": AxiomPreparationImporter,
        },
    ]

    template_prefill_list = [
        {"template": SAMPLE_UPDATE_TEMPLATE},
        {"template": SAMPLE_QC_TEMPLATE},
        {"template": SAMPLE_SELECTION_QPCR_TEMPLATE},
        {"template": PROJECT_STUDY_LINK_SAMPLES_TEMPLATE},
        {"template": SAMPLE_EXTRACTION_TEMPLATE},
        {"template": SAMPLE_TRANSFER_TEMPLATE},
        {"template": LIBRARY_PREPARATION_TEMPLATE},
        {"template": EXPERIMENT_AXIOM_TEMPLATE},
        {"template": EXPERIMENT_INFINIUM_TEMPLATE},
        {"template": SAMPLE_METADATA_TEMPLATE},
        {"template": NORMALIZATION_PLANNING_TEMPLATE},
        {"template": NORMALIZATION_TEMPLATE},
        {"template": SAMPLE_POOLING_TEMPLATE},
        {"template": AXIOM_PREPARATION_TEMPLATE},
    ]
    
    def get_queryset(self):
        self.queryset = Sample.objects.select_related("container").all().distinct()
          # Select related models in derived sample beforehand to improve performance and prefetch then in sample queryset
        derived_samples = DerivedSample.objects.all().select_related('biosample', 'biosample__individual')
        self.queryset = self.queryset.prefetch_related(Prefetch('derived_samples', queryset=derived_samples))

        self.queryset = self.queryset.annotate(
            qc_flag=Case(
                When(Q(quality_flag=False) | Q(quantity_flag=False), then=False),
                When(Q(quality_flag=True) | Q(quantity_flag=True), then=True),
                default=None,
                output_field=BooleanField()
            )
        )
        self.queryset = self.queryset.annotate(count_derived_samples=Count('derived_samples'))
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

    def create(self, request, *args, **kwargs):
        error = {}
        full_sample_data = request.data

        biosample_data = dict(
            **(dict(collection_site=full_sample_data['collection_site']) if full_sample_data['collection_site'] is not None else dict()),
            **(dict(individual_id=full_sample_data['individual']) if full_sample_data['individual'] is not None else dict()),
            **(dict(alias=full_sample_data['alias']) if full_sample_data['alias'] is not None else dict(alias=full_sample_data['name'])),
        )

        try:
            biosample = Biosample.objects.create(**biosample_data)

            derived_sample_data = dict(
                biosample_id=biosample.id,
                sample_kind_id=full_sample_data['sample_kind'],
                **(dict(tissue_source_id=full_sample_data['tissue_source']) if full_sample_data['tissue_source'] is not None else dict()),
            )
            if full_sample_data['experimental_group']:
                derived_sample_data['experimental_group'] = [group.strip() for group in full_sample_data['experimental_group']]

            derived_sample = DerivedSample.objects.create(**derived_sample_data)

            if full_sample_data['coordinate'] is not None and not Coordinate.objects.filter(id=full_sample_data['coordinate']).exists():
                raise ValidationError({"coordinate": "Coordinates do not exist."})

            sample_data = dict(
                name=full_sample_data['name'],
                volume=full_sample_data['volume'],
                creation_date=full_sample_data['creation_date'],
                container_id=full_sample_data['container'],
                **(dict(comment=full_sample_data['comment']) if full_sample_data['comment'] is not None else dict()),
                **(dict(coordinate_id=full_sample_data['coordinate']) if full_sample_data['coordinate'] is not None else dict()),
                **(dict(concentration=full_sample_data['concentration']) if full_sample_data['concentration'] is not None else dict()),
            )

            sample = Sample.objects.create(**sample_data)

            DerivedBySample.objects.create(derived_sample_id=derived_sample.id,
                                           sample_id=sample.id,
                                           volume_ratio=1)

        except ValidationError as err:
            raise ValidationError(err)

        # Serialize full sample using the created sample
        try:
            self.queryset = self.get_queryset()
            serialized_data, _ = self.fetch_data([sample.id])
        except Exception as err:
            raise ValidationError(err)

        return Response(serialized_data[0] if serialized_data else {})

    def update(self, request, *args, **kwargs):
        full_sample = request.data

        if full_sample['coordinate'] is not None and not Coordinate.objects.filter(id=full_sample['coordinate']).exists():
            raise ValidationError({"coordinate": "Coordinates do not exist."})

        sample_data = dict(
            name=full_sample['name'],
            volume=full_sample['volume'],
            creation_date=full_sample['creation_date'],
            container_id=full_sample['container'],
            coordinate_id=full_sample['coordinate'],
            **(dict(comment=full_sample['comment']) if full_sample['comment'] is not None else dict()),
            **(dict(depleted=full_sample['depleted']) if full_sample['depleted'] is not None else dict()),
            **(dict(concentration=full_sample['concentration']) if full_sample['concentration'] is not None else dict()),
            **(dict(quantity_flag=full_sample['quantity_flag']) if full_sample.get('quantity_flag', None) is not None else dict()),
            **(dict(quality_flag=full_sample['quality_flag']) if full_sample.get('quality_flag', None) is not None else dict()),
        )

        derived_sample_data = dict(
            sample_kind_id=full_sample['sample_kind'],
            tissue_source_id=full_sample['tissue_source'],
            **(dict(experimental_group=[group.strip() for group in full_sample['experimental_group']]) if full_sample['experimental_group'] is not None else dict())
        )

        biosample_data = dict(
            alias=full_sample['alias'],
            individual_id=full_sample['individual'],
            **(dict(collection_site=full_sample['collection_site']) if full_sample['collection_site'] is not None else dict()),
        )

        # Retrieve the sample to update
        try:
            sample_to_update = Sample.objects.select_for_update().get(pk=full_sample['id'])
            sample_to_update.__dict__.update(sample_data)
        except Exception as err:
            raise ValidationError(dict(non_field_errors=err))

        # Save the updated sample
        try:
            sample_to_update.save()
        except Exception as err:
            raise ValidationError(err)

        if sample_to_update and not sample_to_update.is_pool:
            if derived_sample_data:
                try:
                    derived_sample_to_update = DerivedSample.objects.select_for_update().get(pk=sample_to_update.derived_sample_not_pool.id)
                    derived_sample_to_update.__dict__.update(derived_sample_data)
                except Exception as err:
                    raise ValidationError(dict(non_field_errors=err))

                # Save the updated derived_sample
                try:
                    derived_sample_to_update.save()
                except Exception as err:
                    raise ValidationError(err)

            if biosample_data:
                try:
                    biosample_to_update = Biosample.objects.select_for_update().get(pk=sample_to_update.biosample_not_pool.id)
                    biosample_to_update.__dict__.update(biosample_data)
                except Exception as err:
                    raise ValidationError(dict(non_field_errors=err))

                # Save the updated biosample
                try:
                    biosample_to_update.save()
                except Exception as err:
                    raise ValidationError(err)

        # Return updated sample
        # Serialize full sample using the created sample
        try:
            self.queryset = self.get_queryset()
            serialized_data, _ = self.fetch_data([sample_to_update.id])
        except Exception as err:
            raise ValidationError(err)

        return Response(serialized_data[0] if serialized_data else {})

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

    @action(detail=False, methods=["get"])
    def list_export_metadata(self, _request):
        self.queryset = self.filter_queryset(self.get_queryset())
        self.metadata_fields, serialized_data = self.fetch_export_metadata()
        return Response(serialized_data)

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = SampleExportSerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        elif self.action == 'list_export_metadata':
            # Base information fields
            fields = tuple(self.metadata_fields)
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of samples in the
        database.
        """
        return Response({"total_count": Sample.objects.all().count()})

    @action(detail=False, methods=["get"])
    def list_collection_sites(self, _request):
        filtered_site = _request.GET.get("filter")
        biosample_queryset = Biosample.objects.all()
        if filtered_site is not None:
            biosample_queryset = biosample_queryset.filter(collection_site__icontains=filtered_site)
        collection_sites = biosample_queryset.distinct("collection_site").values_list("collection_site", flat=True)
        return Response(collection_sites)

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for samples that match the given query
        """
        search_input = _request.GET.get("q")
        is_exact_match = _request.GET.get("exact_match") == 'true'

        if search_input:
            if is_exact_match:
                query = Q(name=search_input)
                query.add(Q(id=search_input), Q.OR)
            else:
                query = Q(name__icontains=search_input)
                query.add(Q(id__icontains=search_input), Q.OR)
            self.queryset = self.get_queryset().filter(query)            

        serialized_data, count = self.fetch_data()
        return Response({"results": serialized_data, "count": count})

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, _request, pk=None):
        return versions_detail(self.get_object())


    @action(detail=False, methods=["post"])
    def add_samples_to_study(self, request, pk=None):
        excepted_sample_ids = request.data.get("excepted_sample_ids")
        default_selection = request.data.get("default_selection", False)
        project_id = request.data.get("project_id")
        study_letter = request.data.get("study_letter")
        step_order = request.data.get("step_order", None)

        samples = self.filter_queryset(self.get_queryset())

        samples = (samples.filter(derived_by_samples__project=project_id, id__in=excepted_sample_ids)
                   if not default_selection
                   else samples.filter(derived_by_samples__project=project_id).exclude(id__in=excepted_sample_ids)).all()
        project = Project.objects.get(id=project_id)

        errors = defaultdict(list)
        with transaction.atomic():
            rollback = False
            for sample in samples:
                _errors, _ = add_sample_to_study(sample, project, study_letter, step_order)
                for key, error in _errors.items():
                    if error:
                        errors[key].extend([error] if isinstance(error, str) else error)
                        rollback = True
            if rollback:
                transaction.set_rollback(True)
        
        if errors:
            raise ValidationError(errors)
        else:
            return Response(status=204)