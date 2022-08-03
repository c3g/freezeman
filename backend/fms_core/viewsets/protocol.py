from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import Protocol
from fms_core.serializers import ProtocolSerializer

class ProtocolViewSet(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]