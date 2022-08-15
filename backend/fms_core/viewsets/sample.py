import json
from typing import Any, List, Union
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, When, Case, BooleanField, Prefetch, OuterRef, Subquery, Exists
from django.core.exceptions import ValidationError

from ..utils import RE_SEPARATOR, make_generator

from fms_core.models import Sample, Container, Biosample, DerivedSample, DerivedBySample, Project
from fms_core.serializers import SampleSerializer, SampleExportSerializer, NestedSampleSerializer

from fms_core.template_importer.importers import SampleSubmissionImporter, SampleUpdateImporter, SampleQCImporter, SampleMetadataImporter
from fms_core.template_importer.importers import SampleSelectionQPCRImporter, LibraryPreparationImporter, ExperimentRunImporter, NormalizationImporter

from fms_core.templates import SAMPLE_SUBMISSION_TEMPLATE, SAMPLE_UPDATE_TEMPLATE, SAMPLE_QC_TEMPLATE, LIBRARY_PREPARATION_TEMPLATE
from fms_core.templates import PROJECT_LINK_SAMPLES_TEMPLATE, SAMPLE_EXTRACTION_TEMPLATE, SAMPLE_TRANSFER_TEMPLATE, SAMPLE_SELECTION_QPCR_TEMPLATE, SAMPLE_METADATA_TEMPLATE, NORMALIZATION_TEMPLATE
from fms_core.templates import EXPERIMENT_INFINIUM_TEMPLATE

from ._utils import TemplateActionsMixin, TemplatePrefillsMixin, _list_keys, versions_detail
from ._constants import _sample_filterset_fields
from fms_core.filters import SampleFilter


class SampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin, TemplatePrefillsMixin):
    queryset = Sample.objects.select_related("container").all().distinct()
    queryset = queryset.annotate(
        qc_flag=Case(
            When(Q(quality_flag=True) & Q(quantity_flag=True), then=True),
            When(Q(quality_flag=False) | Q(quantity_flag=False), then=False),
            default=None,
            output_field=BooleanField()
        )
    )
    serializer_class = SampleSerializer

    ordering_fields = (
        *_list_keys(_sample_filterset_fields),
    )

    filterset_fields = {
        **_sample_filterset_fields,
    }

    filter_class = SampleFilter

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
            "template": [EXPERIMENT_INFINIUM_TEMPLATE["identity"]],
            "importer": ExperimentRunImporter,
        },
        {
            "name": "Add Metadata to Samples",
            "description": "Upload the provided template with custom metadata to be added to samples.",
            "template": [SAMPLE_METADATA_TEMPLATE["identity"]],
            "importer": SampleMetadataImporter,
        },
        {
            "name": "Normalize Samples or Libraries",
            "description": "Upload the provided template with information to normalize samples or libraries.",
            "template": [NORMALIZATION_TEMPLATE["identity"]],
            "importer": NormalizationImporter,
        },
    ]

    template_prefill_list = [
        {"template": SAMPLE_UPDATE_TEMPLATE},
        {"template": SAMPLE_QC_TEMPLATE},
        {"template": SAMPLE_SELECTION_QPCR_TEMPLATE},
        {"template": PROJECT_LINK_SAMPLES_TEMPLATE},
        {"template": SAMPLE_EXTRACTION_TEMPLATE},
        {"template": SAMPLE_TRANSFER_TEMPLATE},
        {"template": LIBRARY_PREPARATION_TEMPLATE},
        {"template": EXPERIMENT_INFINIUM_TEMPLATE},
        {"template": SAMPLE_METADATA_TEMPLATE},
        {"template": NORMALIZATION_TEMPLATE},
    ]

    def get_queryset(self):
        # Select related models in derived sample beforehand to improve performance and prefetch then in sample queryset
        derived_samples = DerivedSample.objects.all().select_related('biosample', 'biosample__individual')
        self.queryset = self.queryset.prefetch_related(Prefetch('derived_samples', queryset=derived_samples))

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
            collection_site=full_sample_data['collection_site'],
            **(dict(individual_id=full_sample_data['individual']) if full_sample_data[
                                                                         'individual'] is not None else dict()),
            **(dict(alias=full_sample_data['alias']) if full_sample_data['alias'] is not None else dict()),
        )

        try:
            biosample = Biosample.objects.create(**biosample_data)

            derived_sample_data = dict(
                biosample_id=biosample.id,
                sample_kind_id=full_sample_data['sample_kind'],
                **(dict(tissue_source_id=full_sample_data['tissue_source']) if full_sample_data['tissue_source'] is not None else dict()),
            )
            if full_sample_data['experimental_group']:
                derived_sample_data['experimental_group'] = json.dumps([
                    g.strip()
                    for g in RE_SEPARATOR.split(full_sample_data['experimental_group'])
                    if g.strip()
                ])

            derived_sample = DerivedSample.objects.create(**derived_sample_data)

            sample_data = dict(
                name=full_sample_data['name'],
                volume=full_sample_data['volume'],
                creation_date=full_sample_data['creation_date'],
                container_id=full_sample_data['container'],
                **(dict(comment=full_sample_data['comment']) if full_sample_data['comment'] is not None else dict()),
                **(dict(coordinates=full_sample_data['coordinates']) if full_sample_data[
                                                                            'coordinates'] is not None else dict()),
                **(dict(concentration=full_sample_data['concentration']) if full_sample_data[
                                                                                'concentration'] is not None else dict()),
            )

            sample = Sample.objects.create(**sample_data)

            DerivedBySample.objects.create(derived_sample_id=derived_sample.id,
                                           sample_id=sample.id,
                                           volume_ratio=1)

        except ValidationError as err:
            raise ValidationError(err)

        # Serialize full sample using the created sample
        try:
            serializer = SampleSerializer(Sample.objects.get(pk=sample.id))
            full_sample = serializer.data
        except Exception as err:
            raise ValidationError(err)

        return Response(full_sample)

    def update(self, request, *args, **kwargs):
        full_sample = request.data

        sample_data = dict(
            name=full_sample['name'],
            volume=full_sample['volume'],
            creation_date=full_sample['creation_date'],
            container_id=full_sample['container'],
            **(dict(comment=full_sample['comment']) if full_sample['comment'] is not None else dict()),
            **(dict(coordinates=full_sample['coordinates']) if full_sample['coordinates'] is not None else dict()),
            **(dict(concentration=full_sample['concentration']) if full_sample['concentration'] is not None else dict()),
        )

        derived_sample_data = dict(
            sample_kind_id=full_sample['sample_kind'],
            tissue_source_id=full_sample['tissue_source']
        )

        biosample_data = dict(
            alias=full_sample['alias'],
            individual_id=full_sample['individual'],
            collection_site=full_sample['collection_site']
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
            serializer = SampleSerializer(Sample.objects.get(pk=sample_to_update.id))
            full_sample = serializer.data
        except Exception as err:
            raise ValidationError(err)

        return Response(full_sample)

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        samples_queryset = self.filter_queryset(self.get_queryset())

        samples_queryset = samples_queryset.annotate(
            first_derived_sample=Subquery(
                DerivedBySample.objects
                .filter(sample=OuterRef("pk"))
                .values_list("derived_sample", flat=True)[:1]
            )
        )

        # full location
        sample_ids = tuple(samples_queryset.values_list('id', flat=True))
        samples_with_full_location = Sample.objects.raw('''WITH RECURSIVE container_hierarchy(id, parent, coordinates, full_location) AS (                                                   
                                                                SELECT container.id, container.location_id, container.coordinates, container.barcode::varchar || ' (' || container.kind::varchar || ') '
                                                                FROM fms_core_container AS container 
                                                                WHERE container.location_id IS NULL

                                                                UNION ALL

                                                                SELECT container.id, container.location_id, container.coordinates, container.barcode::varchar || ' (' || container.kind::varchar || ') at [' || container.coordinates::varchar || '] in ' ||container_hierarchy.full_location::varchar
                                                                FROM container_hierarchy
                                                                JOIN fms_core_container AS container  ON container_hierarchy.id=container.location_id
                                                                ) 

                                                                SELECT sample.id AS id, full_location FROM container_hierarchy JOIN fms_core_sample AS sample ON sample.container_id=container_hierarchy.id 
                                                                WHERE sample.id IN  %s;''', params=[sample_ids])

        location_by_sample = {sample.id: sample.full_location for sample in samples_with_full_location }

        sample_values_queryset = (
            samples_queryset
            .annotate(
                is_library=Exists(DerivedSample.objects.filter(pk=OuterRef("first_derived_sample")).filter(library__isnull=False)),
            )
            .values(
                'id',
                'name',
                'container__id',
                'container__kind',
                'container__name',
                'container__barcode',
                'coordinates',
                'container__location__barcode',
                'container__coordinates',
                'volume',
                'concentration',
                'creation_date',
                'quality_flag',
                'quantity_flag',
                'depleted',
                'comment',
                'is_library',
                'first_derived_sample',
                'projects',
            )
        )
        samples = { s["id"]: s for s in sample_values_queryset }

        project_ids = sample_values_queryset.values_list("projects", flat=True)
        project_values_queryset = Project.objects.filter(id__in=project_ids).values("id", "name")
        projects = { p["id"]: p for p in project_values_queryset }

        derived_sample_ids = sample_values_queryset.values_list("first_derived_sample", flat=True)
        derived_sample_values_queryset = (
            DerivedSample
            .objects
            .filter(id__in=derived_sample_ids)
            .values(
                "id",
                "biosample__id",
                "biosample__alias",
                "sample_kind__name",
                "tissue_source__name",
                "biosample__collection_site",
                "experimental_group",
                "biosample__individual__name",
                "biosample__individual__alias",
                'biosample__individual__sex',
                'biosample__individual__taxon__name',
                'biosample__individual__cohort',
                'biosample__individual__father__name',
                'biosample__individual__mother__name',
                'biosample__individual__pedigree',
            )
        )
        derived_samples = { ds["id"]: ds for ds in derived_sample_values_queryset }

        serialized_data = []
        for sample in samples.values():
            derived_sample = derived_samples[sample["first_derived_sample"]]
            project_names = [projects[p]["name"] for p in make_generator(sample["projects"])]

            data = {
                'sample_id': sample["id"],
                'sample_name': sample["name"],
                'biosample_id': derived_sample["biosample__id"],
                'alias': derived_sample["biosample__alias"],
                'sample_kind': derived_sample["sample_kind__name"],
                'tissue_source': derived_sample["tissue_source__name"] or "",
                'container': sample["container__id"],
                'container_kind': sample["container__kind"],
                'container_name': sample["container__name"],
                'container_barcode': sample["container__barcode"],
                'coordinates': sample["coordinates"],
                'location_barcode': sample["container__location__barcode"] or "",
                'location_coord': sample["container__coordinates"] or "",
                'container_full_location': location_by_sample[sample["id"]] or "",
                'current_volume': sample["volume"],
                'concentration': sample["concentration"],
                'creation_date': sample["creation_date"],
                'collection_site': derived_sample["biosample__collection_site"],
                'experimental_group': json.dumps(derived_sample["experimental_group"]),
                'individual_name': derived_sample["biosample__individual__name"] or "",
                'individual_alias': derived_sample["biosample__individual__alias"] or "",
                'sex': derived_sample["biosample__individual__sex"] or "",
                'taxon': derived_sample["biosample__individual__taxon__name"] or "",
                'cohort': derived_sample["biosample__individual__cohort"] or "",
                'father_name': derived_sample["biosample__individual__father__name"] or "",
                'mother_name': derived_sample["biosample__individual__mother__name"] or "",
                'pedigree': derived_sample["biosample__individual__pedigree"] or "",
                'quality_flag': ["Failed", "Passed"][sample["quality_flag"]] if sample["quality_flag"] is not None else None,
                'quantity_flag': ["Failed", "Passed"][sample["quantity_flag"]] if sample["quantity_flag"] is not None else None,
                'projects': ",".join(project_names),
                'depleted': ["No", "Yes"][sample["depleted"]],
                'is_library': sample["is_library"],
                'comment': sample["comment"],
            }

            serialized_data.append(data)

        return Response(serialized_data)

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = SampleExportSerializer.Meta.fields
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
        samples_data = Biosample.objects.filter().distinct("collection_site")
        collection_sites = [s.collection_site for s in samples_data]
        return Response(collection_sites)

    def get_serializer_class(self):
        # If the nested query param is passed in with a non-false-y string
        # value, use the nested sample serializer; this will nest referenced
        # objects 1 layer deep to provide more data in a single request.

        nested = self.request.query_params.get("nested", False)
        if nested:
            return NestedSampleSerializer
        return SampleSerializer

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for samples that match the given query
        """
        search_input = _request.GET.get("q")
        is_exact_match = _request.GET.get("exact_match") == 'true'

        if is_exact_match:
            query = Q(name=search_input)
            query.add(Q(id=search_input), Q.OR)
        else:
            query = Q(name__icontains=search_input)
            query.add(Q(id__icontains=search_input), Q.OR)

        full_sample_data = Sample.objects.filter(query)
        page = self.paginate_queryset(full_sample_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, _request, pk=None):
        return versions_detail(self.get_object())

