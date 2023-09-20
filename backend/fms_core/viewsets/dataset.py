from django.utils import timezone
from django.http import HttpResponseBadRequest
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q, F, Max, Count
from fms_core.filters import DatasetFilter
from fms_core.models.dataset import Dataset
from fms_core.models.dataset_file import DatasetFile
from fms_core.models._constants import ReleaseStatus, ValidationStatus
from fms_core.serializers import  DatasetSerializer
from fms_core.models.readset import Readset

from ._utils import _list_keys
from ._constants import _dataset_filterset_fields

import fms_core.services.dataset as service

class DatasetViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    queryset = queryset.annotate(
        latest_release_update=Max("readsets__release_status_timestamp")
    )
    queryset = queryset.annotate(
        released_status_count=Count("readsets", filter=Q(readsets__release_status=ReleaseStatus.RELEASED), distinct=True),
        blocked_status_count=Count("readsets", filter=Q(readsets__release_status=ReleaseStatus.BLOCKED), distinct=True)
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
        datasets, dataset_files, errors, _ = service.ingest_run_validation_report(data)
        if errors:
            return HttpResponseBadRequest("\n".join(errors))
        else:
            return Response(self.get_serializer(datasets.values(), many=True).data)
