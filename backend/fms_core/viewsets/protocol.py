from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import Protocol
from fms_core.serializers import ProtocolSerializer, NestedProtocolSerializer

class ProtocolViewSet(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        # If the nested query param is passed in with a non-false-y string
        # value, use the nested protocol serializer; this will nest referenced
        # objects 1 layer deep to provide more data in a single request.

        nested = self.request.query_params.get("nested", False)
        if nested:
            return NestedProtocolSerializer
        return ProtocolSerializer