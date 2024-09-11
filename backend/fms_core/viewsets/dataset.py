from django.utils import timezone
from django.http import HttpResponseBadRequest, HttpResponseServerError
from django.db import transaction
from django.db.models import Q, F, Max, Count
from django.contrib.contenttypes.models import ContentType

from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from fms_core.filters import DatasetFilter
from fms_core.models.dataset import Dataset
from fms_core.models.archived_comment import ArchivedComment
from fms_core.models.dataset_file import DatasetFile
from fms_core.models._constants import ReleaseStatus, ValidationStatus
from fms_core.serializers import  DatasetSerializer
from fms_core.models.readset import Readset

import fms_core.services.dataset as service

from ._utils import _list_keys
from ._constants import _dataset_filterset_fields


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
        data = request.data
        release_status = data.get("release_status")
        exceptions = data.get("exceptions")
        filters = data.get("filters")

        filtered_readsets = Readset.objects.filter(dataset=pk).exclude(validation_status=ValidationStatus.AVAILABLE)
        if not filtered_readsets.exists():
            transaction.set_rollback(True)
            return HttpResponseBadRequest(f"Run must first be validated before release status can be changed.")
        if filters:
            filtered_readsets = filtered_readsets.filter(**filters)
        try:
            # set release flag of all files except exceptions
            included_readsets = filtered_readsets.filter(~Q(id__in=exceptions))
            for included_readset in included_readsets:
                included_readset.release_status = release_status
                included_readset.release_status_timestamp = timezone.now()
                included_readset.released_by = request.user
                included_readset.save()

            # set release flag of exceptions to the opposite flag
            excluded_readsets = Readset.objects.filter(id__in=exceptions)
            opposite_status = [ReleaseStatus.AVAILABLE, ReleaseStatus.BLOCKED, ReleaseStatus.RELEASED][release_status]
            for excluded_readset in excluded_readsets:
                excluded_readset.release_status = opposite_status
                excluded_readset.release_status_timestamp = timezone.now()
                excluded_readset.released_by = request.user
                excluded_readset.save()
        except Exception as err:
            transaction.set_rollback(True)
            return HttpResponseServerError(err)

        return Response(self.get_serializer(Dataset.objects.get(pk=pk)).data)
    
    @action(detail=True, methods=["post"])
    def add_archived_comment(self, request, pk):
        data = request.data
        comment = data.get("comment")
        error_response = HttpResponseBadRequest(f"Could not create comment.")

        content_type_dataset = ContentType.objects.get_for_model(Dataset)
        try:
            archived_comment = ArchivedComment.objects.create(content_type=content_type_dataset, object_id=pk, comment=comment)
        except Dataset.DoesNotExist as err:
            error_response = HttpResponseBadRequest(f"Dataset for comment does not exist.")
            
        if (archived_comment is not None):
            return Response(self.get_serializer(Dataset.objects.get(pk=pk)).data)
        else:
            return error_response
