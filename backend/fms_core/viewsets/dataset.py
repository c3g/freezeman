from django.http import HttpResponseBadRequest
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError

import fms_core.services.dataset as service
from datetime import date

class DatasetViewSet(viewsets.ViewSet):
    def create(self, request, *args, **kwargs):
        data = request.data
        options = data["options"]
        rpm = data["run_processing_metrics"]

        datasets = []
        dataset_files = []
        errors = []
        warnings = []

        for rv in rpm["run_validation"]:
            if errors:
                break

            dataset_args = {}

            dataset_args["project_name"] = rv["project"]
            dataset_args["run_name"] = rpm["run"]
            dataset_args["lane"] = rpm["lane"]
            dataset, errors, warnings = service.create_dataset(**dataset_args)
            if dataset is not None:
                datasets.append(dataset)

            for readset in rpm["readsets"].values():
                if errors:
                    break

                # TODO: actually find the closest matching sample_name
                if readset["sample_name"] in rv["sample"]:
                    for key in readset:
                        if errors:
                            break
                        try:
                            if key not in ["sample_name", "barcodes"]:
                                dataset_file_args = {}
                                dataset_file_args["dataset"] = dataset
                                dataset_file_args["file_path"] = readset[key]
                                dataset_file_args["completion_date"] = options["completion_date"] and date.fromisoformat(options["completion_date"])
                                dataset_file_args["validation_date"] = options["validation_date"] and date.fromisoformat(options["validation_date"])
                                dataset_file_args["sample_name"] = readset["sample_name"]
                
                                dataset_file, newerrors, newwarnings = service.create_dataset_file(**dataset_file_args)
                                errors.extend(newerrors)
                                warnings.extend(newwarnings)

                                if dataset_file is not None:
                                    dataset_files.append(dataset_file)
                        except ValueError as e:
                            errors.append(f"Invalid date: {e}")

        if errors:
            for dataset_file in dataset_files:
                service.delete_dataset_files(dataset_file=dataset_file)
            for dataset in datasets:
                service.delete_dataset(dataset=dataset)

            return HttpResponseBadRequest(errors)
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
    
    def update(self, request, pk=None):
        data = request.data
        errors = []
        warnings = []

        try:
            dataset_file_args = {}
            if "completion_date" in data:
                dataset_file_args["completion_date"] = data["completion_date"] and date.fromisoformat(data["completion_date"])
            if "validation_date" in data:
                dataset_file_args["validation_date"] = data["validation_date"] and date.fromisoformat(data["validation_date"])

            dataset_file, errors, warnings = service.update_dataset_file(pk, **dataset_file_args)
        except ValueError as e:
            errors.append(f"Invalid date: {e}")

        if errors:
            return HttpResponseBadRequest(errors)
        else:
            return Response({
                "dataset_file": service.dataset_file_to_dict(dataset_file),
                "warnings": warnings,
            })
