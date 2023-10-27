from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ._constants import _instrument_filterset_fields

from fms_core.models import Instrument, InstrumentType
from fms_core.serializers import InstrumentSerializer, InstrumentTypeSerializer
from ._utils import _list_keys


class InstrumentViewSet(viewsets.ModelViewSet):
    queryset = Instrument.objects.all()
    serializer_class = InstrumentSerializer
    permission_classes = [IsAuthenticated]

    ordering = ["type__type", "name"]

    filterset_fields = {
        **_instrument_filterset_fields,
    }
    ordering_fields = (
        *_list_keys(_instrument_filterset_fields),
    )

    @action(detail=False, methods=["get"])
    def list_types(self, _request):
        serializer = InstrumentTypeSerializer(InstrumentType.objects.all(), many=True)
        return Response(serializer.data)