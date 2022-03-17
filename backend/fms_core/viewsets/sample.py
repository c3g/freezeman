import json
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.core.exceptions import ValidationError

from ..utils import RE_SEPARATOR

from fms_core.models import Sample, Container, Biosample, DerivedSample, DerivedBySample
from fms_core.serializers import SampleSerializer, SampleExportSerializer, NestedSampleSerializer

from fms_core.template_importer.importers import SampleSubmissionImporter, SampleUpdateImporter, SampleQCImporter
from fms_core.template_importer.importers import SampleSelectionQPCRImporter, LibraryPreparationImporter, ExperimentRunImporter

from fms_core.templates import SAMPLE_SUBMISSION_TEMPLATE, SAMPLE_UPDATE_TEMPLATE, SAMPLE_QC_TEMPLATE, LIBRARY_PREPARATION_TEMPLATE
from fms_core.templates import PROJECT_LINK_SAMPLES_TEMPLATE, SAMPLE_EXTRACTION_TEMPLATE, SAMPLE_TRANSFER_TEMPLATE, SAMPLE_SELECTION_QPCR_TEMPLATE
from fms_core.templates import EXPERIMENT_INFINIUM_TEMPLATE

from ._utils import TemplateActionsMixin, TemplatePrefillsMixin, _list_keys, versions_detail
from ._constants import _sample_filterset_fields
from fms_core.filters import SampleFilter


class SampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin, TemplatePrefillsMixin):
    queryset = Sample.objects.select_related("container").all().distinct()
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
            "description": "Upload the provided template with samples to perfom a sample selection using qPCR",
            "template": [SAMPLE_SELECTION_QPCR_TEMPLATE["identity"]],
            "importer": SampleSelectionQPCRImporter,
        },
        {
            "name": "Prepare Libraries",
            "description": "Upload the provided template with up to 384 new samples.",
            "template": [LIBRARY_PREPARATION_TEMPLATE["identity"]],
            "importer": LibraryPreparationImporter,
        },
        {
            "name": "Add Experiments",
            "description": "Upload the provided template with experiment run information.",
            "template": [EXPERIMENT_INFINIUM_TEMPLATE["identity"]],
            "importer": ExperimentRunImporter,
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
                **(dict(tissue_source=full_sample_data['tissue_source']) if full_sample_data[
                                                                                'tissue_source'] is not None else dict()),
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
            **(dict(concentration=full_sample['concentration']) if full_sample[
                                                                       'concentration'] is not None else dict()),
        )

        derived_sample_data = dict(
            sample_kind_id=full_sample['sample_kind'],
            tissue_source=full_sample['tissue_source']
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
        serializer = SampleExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

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

