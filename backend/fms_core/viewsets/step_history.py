from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import StepHistory
from fms_core.serializers import StepHistorySerializer

from ._constants import _stephistory_filterset_fields

class StepHistoryViewSet(viewsets.ModelViewSet):
    queryset = StepHistory.objects.all()
    serializer_class = StepHistorySerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_stephistory_filterset_fields,
    }