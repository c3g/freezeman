from datetime import datetime
from django.http import HttpResponse, HttpResponseBadRequest
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Exists, OuterRef, Q, Case, When, IntegerField, Max
from django.core.exceptions import ValidationError
from jsonschema.exceptions import ValidationError as JsonValidationError
from fms_core.filters import DatasetFilter
from fms_core.models.dataset import Dataset
from fms_core.models.dataset_file import DatasetFile
from fms_core.models._constants import ReleaseFlag
from fms_core.serializers import DatasetFileSerializer, DatasetSerializer
from fms_core.schema_validators import RUN_PROCESSING_VALIDATOR

from ._utils import _list_keys
from ._constants import _dataset_filterset_fields

import fms_core.services.dataset as service

class DatasetViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    queryset = queryset.annotate(
        are_files_released=Exists(DatasetFile.objects.filter(dataset=OuterRef("pk"), release_flag=ReleaseFlag.RELEASE)),
        release_flag=Case(When(Q(are_files_released=True), then=ReleaseFlag.RELEASE), default=ReleaseFlag.BLOCK, output_field=IntegerField()),
        last_release_timestamp=Max("files__release_flag_timestamp")
    )

    serializer_class = DatasetSerializer

    ordering_fields = (
        *_list_keys(_dataset_filterset_fields),
        "last_release_timestamp"
    )

    filterset_fields = {
        **_dataset_filterset_fields,
    }

    filter_class = DatasetFilter

    @action(detail=False, methods=["post"])
    def add_run_processing(self, request, *args, **kwargs):
        data = request.data

        def func(rpm):
            datasets = {}
            dataset_files = []
            errors = []
            warnings = []

            for error in RUN_PROCESSING_VALIDATOR.validator.iter_errors(rpm):
                path = "".join(f'["{p}"]' for p in error.path)
                msg = f"{path}: {error.message}" if error.path else error.message
                errors.append(msg)
            if errors:
                return (datasets, dataset_files, errors, warnings)

            for readset in rpm["readsets"].values():
                project_name = readset["barcodes"][0]["PROJECT"]
                run_name = rpm["run"]
                lane = rpm["lane"]
                dataset_key = (project_name, run_name, lane)
                if dataset_key not in datasets:
                    dataset, errors, warnings = service.create_dataset(project_name=project_name, run_name=run_name, lane=lane)
                    if errors:
                        return (datasets, dataset_files, errors, warnings)
                    else:
                        datasets[dataset_key] = dataset

                dataset = datasets[dataset_key]

                for key in readset:
                    if key not in ["sample_name", "barcodes"] and readset[key]:
                        dataset_file, newerrors, newwarnings = service.create_dataset_file(
                            dataset=dataset,
                            file_path=readset[key],
                            sample_name=readset["sample_name"],
                        )
                        errors.extend(newerrors)
                        warnings.extend(newwarnings)

                        if errors:
                            return (datasets, dataset_files, errors, warnings)
                        else:
                            dataset_files.append(dataset_file)
            
            return (datasets, dataset_files, errors, warnings)
        datasets, dataset_files, errors, _ = func(data)
        if errors:
            return HttpResponseBadRequest("\n".join(errors))
        else:
            return Response(self.get_serializer(datasets.values(), many=True).data)
    
    @action(detail=True, methods=["patch"])
    def set_release_flags(self, request, pk):
        release_flag = request.data.get("release_flag")
        files = DatasetFile.objects.filter(dataset=pk)

        if release_flag is None:
            # pick opposite flag
            release_flag = [ReleaseFlag.BLOCK, ReleaseFlag.RELEASE][files.filter(release_flag=ReleaseFlag.RELEASE).exists()]

        files.update(
            release_flag=release_flag,
            release_flag_timestamp=datetime.now() if release_flag == ReleaseFlag.RELEASE else None
        )
        return Response('')
