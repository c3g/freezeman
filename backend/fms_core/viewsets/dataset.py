from django.http import HttpResponseBadRequest
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError
from fms_core.models.dataset import Dataset
from fms_core.serializers import DatasetFileSerializer, DatasetSerializer
from fms_core.filters import DatasetFilter

from ._utils import _list_keys
from ._constants import _dataset_filterset_fields

import fms_core.services.dataset as service
from datetime import date, datetime

class DatasetViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer

    ordering_fields = (
        *_list_keys(_dataset_filterset_fields),
    )

    filterset_fields = {
        **_dataset_filterset_fields,
    }

    filter_class = DatasetFilter

    def create(self, request):
        data = request.data
        errors = []
        warnings = []

        dataset_files = []

        dataset, errors, warnings = service.create_dataset(data['project_name'], data['run_name'], data['lane'])
        
        for file in data['files']:
            if errors:
                break

            try:
                file["completion_date"] = service.convertToDatetime(file["completion_date"])
                file["validation_date"] = service.convertToDatetime(file["validation_date"])
            except TypeError as e:
                errors.append(str(e))
                break

            dataset_file, errors, warnings = service.create_dataset_file(dataset, **file)
            if errors:
                break
            
            dataset_files.append(dataset_file)
        
        if errors:
            service.dataset_query().filter(pk=dataset).delete()
            service.dataset_file_query().filter(id__in=[d.id for d in dataset_files]).delete()

            return HttpResponseBadRequest(errors)
        else:
            return Response(self.get_serializer(dataset).data)
    
    def update(self, request, pk, *args, **kwargs):
        data = request.data
        errors = []
        warnings = []

        kwargs = {
            'project_name': data['project_name'],
            'run_name': data['run_name'],
            'lane': data['lane'],
        }
        _, errors, warnings = service.update_dataset(pk, **kwargs)
        
        for file in data['files']:
            if errors:
                break

            try:
                file["completion_date"] = service.convertToDatetime(file["completion_date"])
                file["validation_date"] = service.convertToDatetime(file["validation_date"])
            except TypeError as e:
                errors.append(str(e))
                break

            _, errors, warnings = service.update_dataset_file(file["id"], **file)
            if errors:
                break
        
        if errors:
            return HttpResponseBadRequest(errors)
        else:
            return Response(self.get_serializer(service.dataset_query().filter(pk=pk).first()).data)
        

    @action(detail=False, methods=["post"])
    def create_from_run_processing(self, request, *args, **kwargs):
        data = request.data

        datasets, dataset_files, errors, warnings = service.create_from_run_processing(data, None, None)
        if errors:
            service.dataset_query().filter(id__in=[d.id for d in datasets]).delete()
            service.dataset_file_query().filter(id__in=[d.id for d in dataset_files]).delete()

            return HttpResponseBadRequest(errors)
        else:
            return Response(self.get_serializer(datasets, many=True).data)

