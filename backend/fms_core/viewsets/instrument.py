from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from fms_core.models import Instrument, InstrumentType
from fms_core.serializers import InstrumentSerializer, InstrumentTypeSerializer


class InstrumentViewSet(viewsets.ModelViewSet):
    queryset = Instrument.objects.all()
    serializer_class = InstrumentSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def list_types(self, _request):
        serializer = InstrumentTypeSerializer(InstrumentType.objects.all(), many=True)
        return Response(serializer.data)