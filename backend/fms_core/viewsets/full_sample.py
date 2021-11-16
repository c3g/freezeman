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


from fms_core.models import FullSample, Biosample, Sample, DerivedSample, SampleKind, Container, Individual, DerivedBySample
from fms_core.serializers import FullSampleSerializer, FullSampleExportSerializer, SampleSerializer
from fms_core.template_importer.importers import SampleSubmissionImporter, SampleUpdateImporter

from fms_core.template_paths import SAMPLE_SUBMISSION_TEMPLATE, SAMPLE_UPDATE_TEMPLATE

from ._constants import _full_sample_filterset_fields
from ._utils import TemplateActionsMixin, _list_keys, versions_detail
from fms_core.services.sample import create_full_sample

class FullSampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = FullSample.objects.select_related("individual", "container", "sample_kind", "biosample", "derived_sample").all()
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
        project_name_filter = self.request.query_params.get('sample__projects__name__icontains')

        if project_name_filter:
            projects = FullSample.objects.filter(projects_names__icontains=project_name_filter)
            return projects

        return self.queryset


    def create(self, request, *args, **kwargs):
        error = {}
        full_sample = request.data

        #Container related information
        try:
            container_obj = Container.objects.get(pk=full_sample['container'])
        except Exception as err:
            error['container'] = err

        #Individual related information
        individual_obj = None
        if full_sample['individual']:
            try:
                individual_obj = Individual.objects.get(pk=full_sample['individual'])
            except Exception as err:
                error['individual'] = err

        #Sample Kind related information
        try:
            sample_kind_obj = SampleKind.objects.get(pk=full_sample['sample_kind'])
        except Exception as err:
            error['sample_kind'] = err

        biosample_data = dict(
            collection_site=full_sample['collection_site'],
            **(dict(individual=individual_obj) if individual_obj is not None else dict()),
            **(dict(alias=full_sample['alias']) if full_sample['alias'] is not None else dict()),
        )

        try:
            biosample = Biosample.objects.create(**biosample_data)

            derived_sample_data = dict(
                biosample_id=biosample.id,
                sample_kind=sample_kind_obj,
                **(dict(tissue_source=full_sample['tissue_source']) if full_sample['tissue_source'] is not None else dict()),
            )
            if full_sample['experimental_group']:
                derived_sample_data['experimental_group'] = json.dumps([
                    g.strip()
                    for g in RE_SEPARATOR.split(full_sample['experimental_group'])
                    if g.strip()
                ])

            derived_sample = DerivedSample.objects.create(**derived_sample_data)

            sample_data = dict(
                name=full_sample['name'],
                volume=full_sample['volume'],
                creation_date=full_sample['creation_date'],
                container=container_obj,
                **(dict(comment=full_sample['comment']) if full_sample['comment'] is not None else dict()),
                **(dict(coordinates=full_sample['coordinates']) if full_sample['coordinates'] is not None else dict()),
                **(dict(concentration=full_sample['concentration']) if full_sample['concentration'] is not None else dict()),
            )

            sample = Sample.objects.create(**sample_data)

            DerivedBySample.objects.create(derived_sample_id=derived_sample.id,
                                           sample_id=sample.id,
                                           volume_ratio=1)

        except ValidationError as err:
            raise ValidationError(err)

        serializer = SampleSerializer(sample)
        data = serializer.data
        return Response(data)

    def update(self, request, *args, **kwargs):
        full_sample = request.data

        #Retrive the sample to update
        try:
            sample_to_update = Sample.objects.get(pk=full_sample['id'])
        except Exception as e:
            raise ValidationError(e)

        #Update individual fields
        if full_sample['name']:
            sample_to_update.name = full_sample['name']
        if full_sample['container']:
            try:
                new_container = Container.objects.get(pk=full_sample['container'])
            except Exception as e:
                raise ValidationError(e)
            sample_to_update.container = new_container
        if full_sample['coordinates']:
            sample_to_update.coordinates = full_sample['coordinates']
        if full_sample['volume']:
            sample_to_update.volume = full_sample['volume']
        if full_sample['concentration']:
            sample_to_update.concentration = float_to_decimal(full_sample['concentration'])
        if full_sample['depleted'] is not None:
            sample_to_update.depleted = full_sample['depleted']

        #Save the new sample
        try:
            sample_to_update.save()
        except ValidationError as err:
            raise ValidationError(err)

        #Return new sample
        serializer = SampleSerializer(sample_to_update)
        data = serializer.data
        return Response(data)

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

        experimental_groups = Counter()
        for eg in DerivedSample.objects.values_list("experimental_group", flat=True):
            experimental_groups.update(eg)

        return Response({"total_count": Sample.objects.all().count()})

    @action(detail=False, methods=["get"])
    def list_collection_sites(self, _request):
        samples_data = Biosample.objects.filter().distinct("collection_site")
        collection_sites = [s.collection_site for s in samples_data]
        return Response(collection_sites)


    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for samples that match the given query
        """
        search_input = _request.GET.get("q")

        query = Q(name__icontains=search_input)
        query.add(Q(alias__icontains=search_input), Q.OR)
        query.add(Q(id__icontains=search_input), Q.OR)

        samples_data = Sample.objects.filter(query)
        page = self.paginate_queryset(samples_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)