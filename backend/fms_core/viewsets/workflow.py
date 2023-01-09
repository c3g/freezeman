from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from django.db.models import Prefetch

from fms_core.models import Workflow, StepOrder
from fms_core.serializers import WorkflowSerializer

from ._constants import _workflow_filterset_fields

class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.prefetch_related(Prefetch("StepsOrder", queryset=StepOrder.objects.select_related("step"))).all()
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_workflow_filterset_fields,
    }