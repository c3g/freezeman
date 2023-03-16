from django.utils import timezone
from django.http import HttpResponseBadRequest
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q, F, Max, Count
from fms_core.filters import DatasetFilter
from fms_core.models.dataset import Dataset
from fms_core.models.dataset_file import DatasetFile
from fms_core.models._constants import ReleaseStatus
from fms_core.serializers import  DatasetSerializer
from fms_core.schema_validators import RUN_PROCESSING_VALIDATOR

from ._utils import _list_keys
from ._constants import _dataset_filterset_fields

import fms_core.services.dataset as service

class DatasetViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    queryset = queryset.annotate(
        latest_release_update=Max("files__release_status_timestamp")
    )
    queryset = queryset.annotate(
        released_status_count=Count("files", filter=Q(files__release_status=ReleaseStatus.RELEASED), distinct=True)
    )

    serializer_class = DatasetSerializer

    ordering_fields = (
        *_list_keys(_dataset_filterset_fields),
        "latest_release_update",
        "released_status_count"
    )

    filterset_fields = {
        **_dataset_filterset_fields,
    }

    filterset_class = DatasetFilter

    @action(detail=False, methods=["post"])
    def add_run_processing(self, request, *args, **kwargs):
        data = request.data

        def func(rpm):
            datasets = {}
            dataset_files = []
            errors = []
            warnings = []

            for error in RUN_PROCESSING_VALIDATOR.validator.iter_errors(rpm):
                if error.path[0] == "lane":
                    errors.append(f'Lane must be a positive integer (e.g. "0", "1", ..., .etc). It was given "{rpm["lane"]}".')
                else:
                    path = "".join(f'["{p}"]' for p in error.path)
                    msg = f"{path}: {error.message}" if error.path else error.message
                    errors.append(msg)
            if errors:
                return (datasets, dataset_files, errors, warnings)

            for readset in rpm["readsets"].values():
                external_project_id = readset["barcodes"][0]["PROJECT"]
                run_name = rpm["run"]
                lane = int(rpm["lane"])
                dataset_key = (external_project_id, run_name, lane)
                if dataset_key not in datasets:
                    dataset, errors, warnings = service.create_dataset(external_project_id=external_project_id, run_name=run_name, lane=lane, replace=True)
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
    def set_release_status(self, request, pk):
        data = request.data
        release_status = data.get("release_status")
        exceptions = data.get("exceptions")
        filters = data.get("filters")

        filtered_files = DatasetFile.objects.filter(dataset=pk)
        if filters:
            filtered_files = filtered_files.filter(**filters)

        # set release flag of all files except exceptions
        included_files = filtered_files.filter(~Q(id__in=exceptions))
        for included_file in included_files:
            included_file.release_status = release_status
            included_file.release_status_timestamp=timezone.now()
            included_file.save()

        # set release flag of exceptions to the opposite flag
        excluded_files = DatasetFile.objects.filter(id__in=exceptions)
        opposite_status = [ReleaseStatus.AVAILABLE, ReleaseStatus.BLOCKED, ReleaseStatus.RELEASED][release_status]
        for excluded_file in excluded_files:
            excluded_file.release_status = opposite_status
            excluded_file.release_status_timestamp=timezone.now()
            excluded_file.save()

        return Response(self.get_serializer(Dataset.objects.get(pk=pk)).data)