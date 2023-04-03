from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError
from django.http import HttpResponseBadRequest
from fms_core.models.step_order import StepOrder

from fms_core.models.workflow import Workflow

from ._constants import _sample_next_step_by_study_filterset_fields
from fms_core.models import SampleNextStepByStudy, Sample, Study
from fms_core.services.sample_next_step import dequeue_sample_from_specific_step_study_workflow
from fms_core.serializers import SampleNextStepByStudySerializer
from ._utils import _list_keys

class SampleNextStepByStudyViewSet(viewsets.ModelViewSet):
    queryset = SampleNextStepByStudy.objects.select_related("sample_next_step").select_related("step_order").all()
    serializer_class = SampleNextStepByStudySerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_sample_next_step_by_study_filterset_fields
    }
    ordering_fields = {
        *_list_keys( _sample_next_step_by_study_filterset_fields),
    }

    def destroy(self, request, pk=None):
        removed = False
        errors = []
        if pk is not None:
            try:
                values_list = self.get_queryset().filter(id=pk).values_list("sample_next_step__sample", "study", "step_order__order")
                if not values_list:
                    return HttpResponseBadRequest(f"Sample does not appear to be queued to the study's workflow.")
                for sample_id, study_id, order in values_list:
                    sample = Sample.objects.get(id=sample_id)
                    study = Study.objects.get(id=study_id)
                    removed, errors, _ = dequeue_sample_from_specific_step_study_workflow(sample, study, order)
            except Exception as err:
                return HttpResponseBadRequest(err)
        if removed:
            return Response(data={"details": removed}, status=status.HTTP_200_OK)
        else:
            return HttpResponseBadRequest(errors or f"Missing sample-next-step-by-study ID to delete.")

    """
    Returns the number of samples at each step of a study workflow. A dictionary is returned where
    the key is a step order ID and the value is the count of the number of samples queued at that step.

    Args:
    study__id__in: The study ID

    Returns:
    Dictionary of step order ID / sample count pairs, one for each step in the study workflow.
    """
    @action(detail=False, methods=["get"])    
    def summary(self, request):
        study_id = request.GET.get('study__id__in')
        study = Study.objects.get(pk=study_id)
        step_orders = StepOrder.objects.filter(workflow=study.workflow)
        counts = dict()
        for step_order in step_orders:
            count = SampleNextStepByStudy.objects.filter(study=study_id, step_order=step_order).count()
            counts[step_order.id] = count
        return Response(counts)