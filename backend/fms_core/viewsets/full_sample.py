from collections import Counter
from django.core import serializers
import json

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q, F
from django.core.exceptions import ValidationError

from datetime import datetime
from ..utils import RE_SEPARATOR, float_to_decimal


from fms_core.models import FullSample, Biosample, Sample, DerivedSample,  Container, DerivedBySample
from fms_core.serializers import FullSampleSerializer, FullSampleExportSerializer, SampleSerializer, FullNestedSampleSerializer
from fms_core.template_importer.importers import SampleSubmissionImporter, SampleUpdateImporter

from fms_core.template_paths import SAMPLE_SUBMISSION_TEMPLATE, SAMPLE_UPDATE_TEMPLATE

from ._constants import _full_sample_filterset_fields
from ._utils import TemplateActionsMixin, _list_keys

class FullSampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = FullSample.objects.select_related("individual", "container", "sample_kind").all()
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

    def get_queryset(self):
        container_barcode = self.request.query_params.get('container__barcode__recursive')
        container_name = self.request.query_params.get('container__name__recursive')
        recursive = container_barcode or container_name

        #To filter samples by project
        project_name_filter = self.request.query_params.get('projects__name__icontains')
        project_id_filter = self.request.query_params.get('projects__id__in')


        if project_name_filter:
            self.queryset = self.queryset.filter(projects_names__icontains=project_name_filter)

        if project_id_filter:
            self.queryset = self.queryset.filter(projects__icontains=project_id_filter)

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
            **(dict(individual_id=full_sample_data['individual']) if full_sample_data['individual'] is not None else dict()),
            **(dict(alias=full_sample_data['alias']) if full_sample_data['alias'] is not None else dict()),
        )

        try:
            biosample = Biosample.objects.create(**biosample_data)

            derived_sample_data = dict(
                biosample_id=biosample.id,
                sample_kind_id=full_sample_data['sample_kind'],
                **(dict(tissue_source=full_sample_data['tissue_source']) if full_sample_data['tissue_source'] is not None else dict()),
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
                **(dict(coordinates=full_sample_data['coordinates']) if full_sample_data['coordinates'] is not None else dict()),
                **(dict(concentration=full_sample_data['concentration']) if full_sample_data['concentration'] is not None else dict()),
            )

            sample = Sample.objects.create(**sample_data)

            DerivedBySample.objects.create(derived_sample_id=derived_sample.id,
                                           sample_id=sample.id,
                                           volume_ratio=1)

        except ValidationError as err:
            raise ValidationError(err)

        #Serialize full sample using the created sample
        try:
            serializer = FullSampleSerializer(FullSample.objects.get(pk=sample.id))
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

        #Retreive the sample to update
        try:
            Sample.objects.filter(pk=full_sample['id']).update(**sample_data)
            sample_to_update = Sample.objects.get(pk=full_sample['id'])
        except Exception as err:
            if any('coordinates' in arg for arg in err.args):
                raise ValidationError(dict(coordinates=err))
            else:
                raise ValidationError(dict(non_field_errors=err))

        #Save the new sample
        try:
            sample_to_update.save()
        except Exception as err:
            raise ValidationError(err)

        #Return new sample
        # Serialize full sample using the created sample
        try:
            serializer = FullSampleSerializer(FullSample.objects.get(pk=sample_to_update.id))
            full_sample = serializer.data
        except Exception as err:
            raise ValidationError(err)

        return Response(full_sample)

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
            return FullNestedSampleSerializer
        return FullSampleSerializer


    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for samples that match the given query
        """
        search_input = _request.GET.get("q")

        query = Q(name__icontains=search_input)
        query.add(Q(alias__icontains=search_input), Q.OR)
        query.add(Q(id__icontains=search_input), Q.OR)

        full_sample_data = FullSample.objects.filter(query)
        page = self.paginate_queryset(full_sample_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)