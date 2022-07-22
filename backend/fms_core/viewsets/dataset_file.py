from datetime import datetime
from rest_framework import viewsets
from fms_core.models.dataset_file import DatasetFile
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
        release_flag = request.data.get("release_flag")
        if release_flag is not None:
            RELEASED = DatasetFile.ReleaseFlag.RELEASE
            request.data["release_flag_timestamp"] = datetime.now() if release_flag == RELEASED else None
        return super().update(request, *args, **kwargs)
