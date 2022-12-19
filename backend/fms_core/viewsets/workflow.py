from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from django.db.models import Prefetch

from fms_core.models import Workflow, StepOrder
from fms_core.serializers import WorkflowSerializer


class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.prefetch_related(Prefetch("StepsOrder", queryset=StepOrder.objects.select_related("step"))).all()
    serializer_class = WorkflowSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]
