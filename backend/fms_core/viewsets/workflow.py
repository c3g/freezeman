from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from django.db.models import Prefetch

from fms_core.models import Workflow, StepOrder
from fms_core.serializers import WorkflowSerializer, StepOrderSerializer
from fms_core.services.step_order import valid_step_orders_for_study_queueing

from ._constants import _workflow_filterset_fields

class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.prefetch_related(Prefetch("steps_order", queryset=StepOrder.objects.select_related("step"))).all()
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_workflow_filterset_fields,
    }

    ordering = ["name"]

    @action(detail=True, methods=["get"])
    def valid_step_orders_for_sample_queueing(self, request, pk: int, *args, **kwargs):
        """
        Validate the requested workflow step_order for queueing a given list of samples

        Args:
            `request`: Request containing the list of sample ids.
            `pk`: ID of an existing workflow.
            `sample_ids`: list of candidate sample ids for queuing to the workflow.

        Returns:
            Response containing the list of valid step order ids
        """
        errors = []
        sample_ids: list[int] = [int(sample_id) for sample_id in request.GET.get('sample_ids').split(",")] if request.GET.get('sample_ids') is not None else []

        try:
            step_orders = [step_order for step_order in StepOrder.objects.filter(workflow_id=pk).all()]
        except Exception as err:
            raise err
        results, errors, _ = valid_step_orders_for_study_queueing(candidate_sample_ids=sample_ids, tested_step_orders=step_orders)
        if results is not None:
            return Response(data=StepOrderSerializer(results, many=True).data, status=status.HTTP_200_OK)
        else:
            raise errors