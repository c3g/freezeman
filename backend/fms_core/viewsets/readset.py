from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.models.readset import Readset
from fms_core.serializers import ReadsetSerializer, ReadsetWithMetricsSerializer

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

    def get_serializer_class(self):
        with_metrics = self.request.query_params.get("withMetrics", False)
        if(with_metrics):
            return ReadsetWithMetricsSerializer
        return ReadsetSerializer
    
    def update(self, request, *args, **kwargs):
        release_status = request.data.get("release_status")
        validation_status = request.data.get("validation_status")
        if release_status is not None:
            request.data["release_status_timestamp"] = timezone.now()
        if validation_status is not None:
            request.data["validation_status_timestamp"] = timezone.now()
        return super().update(request, *args, **kwargs)
