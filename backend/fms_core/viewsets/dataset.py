from django.http import HttpResponseBadRequest
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError
from fms_core.models.dataset import Dataset
from fms_core.models.dataset_file import DatasetFile
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

    @action(detail=False, methods=["post"])
    def add_run_processing(self, request, *args, **kwargs):
        data = request.data
        completion_date = datetime.now()
        validation_date = None

        def func(rpm, completion_date, validation_date):
            datasets = []
            dataset_files = []
            errors = []
            warnings = []

            rpm_keys = [ "run_validation", "run", "lane", "readsets" ]
            for key in rpm_keys:
                if key not in rpm:
                    errors.append(f"Missing key '{key}' the run processing metric")
            if errors:
                return (datasets, dataset_files, errors, warnings)

            for rv in rpm["run_validation"]:
                rv_keys = [ "project", "sample" ]
                for key in rv_keys:
                    if key not in rv:
                        errors.append(f"Missing key '{key}' in 'run_validation' for run processing metrics '{rpm['run']}'")
                if errors:
                    return (datasets, dataset_files, errors, warnings)

                dataset, errors, warnings = service.create_dataset(project_name=rv["project"], run_name=rpm["run"], lane=rpm["lane"], files=[])
                if errors:
                    return (datasets, dataset_files, errors, warnings)
                else:
                    datasets.append(dataset)

                for readset in rpm["readsets"].values():
                    readset_keys = [ "sample_name" ]
                    for key in readset_keys:
                        if key not in readset:
                            errors.append(f"Missing key '{key}' in 'readsets' for run processing metrics '{rpm['run']}'")
                    if errors:
                        return (datasets, dataset_files, errors, warnings)

                    # TODO: actually find the closest matching sample_name?
                    if readset["sample_name"] in rv["sample"]:
                        for key in readset:
                            try:
                                if key not in ["sample_name", "barcodes"]:
                                    dataset_file, newerrors, newwarnings = service.create_dataset_file(
                                        dataset=dataset,
                                        file_path=readset[key],
                                        sample_name=readset["sample_name"],
                                        completion_date=service.convertToModelDate(completion_date),
                                        validation_date=service.convertToModelDate(validation_date),
                                    )
                                    errors.extend(newerrors)
                                    warnings.extend(newwarnings)

                                    if errors:
                                        return (datasets, dataset_files, errors, warnings)
                                    else:
                                        dataset_files.append(dataset_file)
                            except ValueError as e:
                                errors.append(f"Invalid date: {e}")
                                return (datasets, dataset_files, errors, warnings)
            
            return (datasets, dataset_files, errors, warnings)
        datasets, dataset_files, errors, _ = func(data, completion_date, validation_date)
        if errors:
            return HttpResponseBadRequest(errors)
        else:
            return Response(self.get_serializer(datasets, many=True).data)

