from django.utils import timezone
from django.http import HttpResponseBadRequest, HttpResponseServerError
from django.db import transaction
from django.db.models import Q, Max, Count

from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from fms_core.filters import DatasetFilter
from fms_core.models.dataset import Dataset
from fms_core.services.archived_comment import create_archived_comment_for_model, AUTOMATED_COMMENT_DATASET_RELEASED, AUTOMATED_COMMENT_DATASET_RELEASE_REVOKED
from fms_core.models._constants import ReleaseStatus
from fms_core.serializers import  DatasetSerializer
from fms_core.models.readset import Readset

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
        readset_updates: dict[str, ReleaseStatus] = request.data

        readset_ids = [int(i) for i in readset_updates.keys()]
        readsets = Readset.objects.filter(dataset=pk, id__in=readset_ids)
        is_status_revocation = False

        try:
            release_status_timestamp = timezone.now()
            for readset in readsets:
                release_status = readset_updates[str(readset.id)]
                readset.release_status = release_status
                if release_status == ReleaseStatus.AVAILABLE:
                    is_status_revocation = True
                    readset.release_status_timestamp = None
                    readset.released_by = None
                else:
                    readset.release_status_timestamp = release_status_timestamp
                    readset.released_by = request.user
                readset.save()
        except Exception as e:
            transaction.set_rollback(True)
            return HttpResponseServerError(f"Error updating release status: {e}")

        # Validate that all release status are set (released or blocked) at once.
        readsets = list(Readset.objects.filter(dataset=pk).all())
        readset_count = len(readsets)
        unset_count = len([readset.id for readset in readsets if readset.release_status==ReleaseStatus.AVAILABLE])
        if unset_count > 0 and unset_count < readset_count:
            transaction.set_rollback(True)
            return HttpResponseServerError(f"Cannot set only a subset of a dataset readsets status.")

        if is_status_revocation:
            create_archived_comment_for_model(Dataset, pk, AUTOMATED_COMMENT_DATASET_RELEASE_REVOKED())
        else:
            create_archived_comment_for_model(Dataset, pk, AUTOMATED_COMMENT_DATASET_RELEASED())
        return Response(status=204)
    
    @action(detail=True, methods=["post"])
    def add_archived_comment(self, request, pk):
        data = request.data
        comment = data.get("comment")

        archived_comment, errors, _ = create_archived_comment_for_model(Dataset, pk, comment)
        if archived_comment is None:
            return HttpResponseBadRequest(errors.pop())
        else:
            return Response(self.get_serializer(Dataset.objects.get(pk=pk)).data)
