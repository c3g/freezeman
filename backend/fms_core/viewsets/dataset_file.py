from django.utils import timezone
from rest_framework import viewsets
from fms_core.models.dataset_file import DatasetFile
from fms_core.models._constants import ReleaseStatus
from fms_core.serializers import DatasetFileSerializer

from ._utils import _list_keys
from ._constants import _dataset_file_filterset_fields

class DatasetFileViewSet(viewsets.ModelViewSet):
    queryset = DatasetFile.objects.all()
    serializer_class = DatasetFileSerializer

    ordering_fields = (
        *_list_keys(_dataset_file_filterset_fields),
    )

    filterset_fields = {
        **_dataset_file_filterset_fields,
    }

    def update(self, request, *args, **kwargs):
        release_status = request.data.get("release_status")
        if release_status is not None:
            request.data["release_status_timestamp"] = timezone.now()
        return super().update(request, *args, **kwargs)
