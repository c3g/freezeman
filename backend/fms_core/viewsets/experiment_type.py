from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import ExperimentType
from fms_core.serializers import ExperimentTypeSerializer


class ExperimentTypeViewSet(viewsets.ModelViewSet):
    queryset = ExperimentType.objects.all()
    serializer_class = ExperimentTypeSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]