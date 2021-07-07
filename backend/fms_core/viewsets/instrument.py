from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import Instrument
from fms_core.serializers import InstrumentSerializer


class InstrumentViewSet(viewsets.ModelViewSet):
    queryset = Instrument.objects.all()
    serializer_class = InstrumentSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]