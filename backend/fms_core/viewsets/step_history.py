from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.models import StepHistory, Study, StepOrder
from fms_core.serializers import StepHistorySerializer

from ._constants import _stephistory_filterset_fields

class StepHistoryViewSet(viewsets.ModelViewSet):
    queryset = StepHistory.objects.all()
    serializer_class = StepHistorySerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_stephistory_filterset_fields,
    }

    """
    Returns the number of completed samples for each step in a study's workflow.
    The counts are returned as a dictionary, where the key is a step order ID and
    the value is the count.

    Args:
    study__id__in: Study ID query parameters

    Returns:
    A dictionary of step order ID / sample count pairs.
    """
    @action(detail=False, methods=["get"])    
    def summary(self, request):
        study_id = request.GET.get('study__id__in')
        study = Study.objects.get(pk=study_id)
        step_orders = StepOrder.objects.filter(workflow=study.workflow)
        counts = dict()
        for step_order in step_orders:
            count = StepHistory.objects.filter(study=study_id, step_order=step_order).count()
            counts[step_order.id] = count
        return Response(counts)