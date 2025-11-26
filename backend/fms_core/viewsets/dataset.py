from django.utils import timezone
from django.http import HttpResponseBadRequest, HttpResponseServerError
from django.db import transaction
from django.db.models import Q, Max, Count

from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from fms_core.filters import DatasetFilter
from fms_core.models.dataset import Dataset
from fms_core.services.archived_comment import create_archived_comment_for_model
from fms_core.models._constants import ReleaseStatus
from fms_core.serializers import  DatasetSerializer

import fms_core.services.dataset as service

from ._utils import _list_keys
from ._constants import _dataset_filterset_fields


class DatasetViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    queryset = queryset.annotate(
        latest_release_update=Max("readsets__release_status_timestamp"),
        latest_validation_update=Max("readsets__validation_status_timestamp")
    )
    queryset = queryset.annotate(
        released_status_count=Count("readsets", filter=Q(readsets__release_status=ReleaseStatus.RELEASED), distinct=True),
        blocked_status_count=Count("readsets", filter=Q(readsets__release_status=ReleaseStatus.BLOCKED), distinct=True)
    )

    serializer_class = DatasetSerializer

    ordering_fields = (
        *_list_keys(_dataset_filterset_fields),
        "latest_release_update",
        "released_status_count",
        "latest_validation_update",
    )

    filterset_fields = {
        **_dataset_filterset_fields,
    }

    ordering = ["-id"]

    filterset_class = DatasetFilter

    @transaction.atomic
    @action(detail=False, methods=["post"])
    def add_run_processing(self, request, *args, **kwargs):
        data = request.data
        datasets, dataset_files, errors, _ = service.ingest_run_validation_report(data)
        if errors:
            transaction.set_rollback(True)
            return HttpResponseBadRequest("\n".join(errors))
        else:
            return Response(self.get_serializer(datasets.values(), many=True).data)

    @transaction.atomic
    @action(detail=True, methods=["patch"])
    def set_release_status(self, request, pk):
        readsets_release_status: dict[str, ReleaseStatus] = request.data
        released_count, errors, _ = service.set_dataset_release_status(pk, readsets_release_status, request.user)
        if errors:
            response = HttpResponseServerError(errors)
            transaction.set_rollback(True)
        elif released_count == 0:
            response = Response("No release status was set.")
        else:
            response = Response("Release status set successfully.")
        return response
    
    @action(detail=True, methods=["post"])
    def add_archived_comment(self, request, pk):
        data = request.data
        comment = data.get("comment")

        archived_comment, errors, _ = create_archived_comment_for_model(Dataset, pk, comment)
        if archived_comment is None:
            return HttpResponseBadRequest(errors.pop())
        else:
            return Response(self.get_serializer(Dataset.objects.get(pk=pk)).data)
