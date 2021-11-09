from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import FullSample
from fms_core.serializers import FullSampleSerializer

from ._utils import _list_keys
from ._constants import _full_sample_filterset_fields

class FullSampleViewSet(viewsets.ModelViewSet):
    queryset = FullSample.objects.select_related("individual", "container", "sample_kind", "biosample", "derived_sample").all().distinct()
    serializer_class = FullSampleSerializer

    ordering_fields = (
        *_list_keys(_full_sample_filterset_fields),
    )

    filterset_fields = {
        **_full_sample_filterset_fields,
    }

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = FullSampleSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)