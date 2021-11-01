from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import RunType
from fms_core.serializers import RunTypeSerializer

class RunTypeViewSet(viewsets.ModelViewSet):
    queryset = RunType.objects.all()
    serializer_class = RunTypeSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]
