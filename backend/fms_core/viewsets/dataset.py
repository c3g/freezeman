from datetime import datetime
import json
from typing import Dict, List
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError

from fms_core.models import Dataset, DatasetFile
import fms_core.services.dataset as service

class DatasetViewSet(viewsets.ViewSet):
    def create(self, request, *args, **kwargs):
        data = request.data
        options = data["options"]
        run_processing_metrics = data["run_processing_metrics"]

        datasets = []
        dataset_files = []
        errors = []
        warnings = []

        datasets, errors, warnings = create_datasets(run_processing_metrics)
        for dataset in datasets:
            if errors:
                break
            else:
                new_dataset_files, new_errors, new_warnings = create_dataset_files(options, run_processing_metrics, dataset)
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

def create_datasets(run_processing_metrics: Dict):
    datasets = []
    errors = []
    warnings = []
    rpm = run_processing_metrics

    for rv in rpm["run_validation"]:
        dataset_args = {}

        dataset_args["project_name"] = rv["project"]
        dataset_args["run_name"] = rpm["run"]
        dataset_args["lane"] = rpm["lane"]
        dataset, errors, warnings = service.create_dataset(**dataset_args)
        datasets.append(dataset)
    
    return (datasets, errors, warnings)

def create_dataset_files(options: Dict, run_processing_metrics: Dict, dataset: Dataset):
    dataset_files = []
    errors = []
    warnings = []
    rpm = run_processing_metrics

    rv = None
    for rv in rpm["run_validation"]:
        if rv["project"] == dataset.project_name and rpm["run"] == dataset.run_name:
            break
    if rv is None:
        errors.append("Could not find run validation for dataset")

    if errors:
        return (dataset_files, errors, warnings)

    for readset in rpm["readsets"].values():
        # TODO: actually find the closest matching sample_name
        if readset["sample_name"] in rv["sample"]:
            for key in readset:
                if key not in ["sample_name", "barcodes"]:
                    dataset_file_args = {}
                    dataset_file_args["dataset"] = dataset
                    dataset_file_args["file_path"] = readset[key]
                    dataset_file_args["completion_date"] = options.get("completion_date", None)
                    dataset_file_args["validation_date"] = options.get("validation_date", None)
                    dataset_file_args["sample_name"] = readset["sample_name"]
    
                    dataset_file, newerrors, newwarnings = service.create_dataset_file(**dataset_file_args)
                    errors.extend(newerrors)
                    warnings.extend(newwarnings)

                    if not newerrors:
                        dataset_files.append(dataset_file)
                        

    return (dataset_files, errors, warnings)
