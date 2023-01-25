from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Prefetch

from fms_core.models import Step, StepSpecification
from fms_core.serializers import StepSerializer

from ._constants import _step_filterset_fields

class StepViewSet(viewsets.ModelViewSet):
    queryset = Step.objects.prefetch_related(Prefetch("step_specifications", queryset=StepSpecification.objects.all()))
    serializer_class = StepSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_step_filterset_fields,
    }