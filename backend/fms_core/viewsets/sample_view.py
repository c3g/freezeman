from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import SampleView
from fms_core.serializers import SampleViewSerializer

from ._utils import TemplateActionsMixin, _list_keys, versions_detail
from ._constants import _sampleview_filterset_fields


class SampleViewViewSet(viewsets.ModelViewSet):
    queryset = SampleView.objects.all()
    serializer_class = SampleViewSerializer

    ordering_fields = (
        *_list_keys(_sampleview_filterset_fields),
    )

    filterset_fields = {
        **_sampleview_filterset_fields,
    }

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = SampleViewSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)