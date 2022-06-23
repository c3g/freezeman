from datetime import datetime
import json
from typing import List
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError

from fms_core.models import Dataset, DatasetFile
import fms_core.services.dataset as service

class DatasetViewSet(viewsets.ViewSet):
    def create(self, request, *args, **kwargs):
        data = request.data

        datasets = []
        dataset_files = []
        errors = []
        warnings = []

        datasets, errors, warnings = create_datasets(data)
        for dataset in datasets:
            if errors:
                break
            else:
                new_dataset_files, new_errors, new_warnings = create_dataset_files(data, dataset)
                errors.extend(new_errors)
                warnings.extend(new_warnings)
                dataset_files.extend(new_dataset_files)

        if errors:
            for dataset_file in dataset_files:
                service.delete_dataset_files(dataset_file=dataset_file)
            for dataset in datasets:
                service.delete_dataset(dataset=dataset)

            raise ValidationError(errors)
        else:
            return Response({
                "datasets": [
                    service.dataset_to_dict(dataset)
                    for dataset in datasets
                ],
                "dataset_files": [
                    service.dataset_file_to_dict(dataset_file)
                    for dataset_file in dataset_files
                ],
                "warnings": warnings,
            })

def create_datasets(data):
    datasets = []
    errors = []
    warnings = []

    for rv in data["run_validations"]:
        dataset_args = {}

        dataset_args["project_name"] = rv["project"]
        dataset_args["run_name"] = data["run"]
        dataset_args["lane"] = data["lane"]
        dataset, errors, warnings = service.create_dataset(**dataset_args)
        datasets.append(dataset)
    
    return (datasets, errors, warnings)

def create_dataset_files(data, dataset: Dataset):
    dataset_files = []
    errors = []
    warnings = []

    rv = None
    for rv in data["run_validations"]:
        if rv["project"] == dataset.project_name and rv["run"] == dataset.run_name:
            break
    if rv is None:
        errors.append("Could not find run validation for dataset")


    if errors:
        return (dataset_files, errors, warnings)

    dataset_file_args = {}
    for readset in data["readsets"]:
        # TODO: actually find the closest matching sample_name
        # TODO: create dataset_file for each file path
        if readset["sample_name"] in rv["sample"]:
            dataset_file_args["dataset"] = dataset
            dataset_file_args["file_path"] = readset["fastq_1"]
            dataset_file_args["completion_date"] = datetime.now()
            dataset_file_args["validation_date"] = datetime.now()
            dataset_file_args["sample_name"] = readset["sample_name"]
    
    if dataset_file_args:
        dataset_file, newerrors, newwarnings = service.create_dataset_file(**dataset_file_args)
        errors.extend(newerrors)
        warnings.extend(newwarnings)

        if not errors:
            dataset_files.append(dataset_file)
    else:
        errors.append("Could not find readset for dataset")

    return ([] if errors else dataset_files, errors, warnings)
