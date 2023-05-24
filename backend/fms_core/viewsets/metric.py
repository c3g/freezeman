from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated


from fms_core.models import Metric
from fms_core.serializers import MetricSerializer

from ._utils import _list_keys
from ._constants import _metric_filterset_fields


class MetricViewSet(viewsets.ModelViewSet):
    queryset = Metric.objects.select_related("readset__dataset").all()
    serializer_class = MetricSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_metric_filterset_fields,
    }

    ordering_fields = (
        *_list_keys(_metric_filterset_fields),
    )