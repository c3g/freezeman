from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.models.readset import Readset
from fms_core.serializers import ReadsetSerializer

from ._utils import _list_keys
from ._constants import _readset_filterset_fields

class ReadsetViewSet(viewsets.ModelViewSet):
    queryset = Readset.objects.all()

    serializer_class = ReadsetSerializer

    ordering_fields = (
        *_list_keys(_readset_filterset_fields),
    )

    filterset_fields = {
        **_readset_filterset_fields
    }
    
    def update(self, request, *args, **kwargs):
        validation_status = request.data.get("validation_status")
        if validation_status is not None:
            request.data["validation_status_timestamp"] = timezone.now()
        return super().update(request, *args, **kwargs)
