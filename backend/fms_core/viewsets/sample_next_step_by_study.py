from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError
from django.http import HttpResponseBadRequest
from django.db.models import Count, F
from django.db.models.functions import Coalesce
from fms_core.models.step_order import StepOrder

from fms_core.models.workflow import Workflow

from ._constants import _sample_next_step_by_study_filterset_fields
from fms_core._constants import WorkflowAction
from fms_core.models import SampleNextStepByStudy, Sample, Study, StepHistory
from fms_core.services.sample_next_step import dequeue_sample_from_specific_step_study_workflow
from fms_core.serializers import SampleNextStepByStudySerializer
from ._utils import _list_keys

class SampleNextStepByStudyViewSet(viewsets.ModelViewSet):
    queryset = SampleNextStepByStudy.objects.select_related("sample_next_step").select_related("step_order").all().distinct()
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

                    if removed:
                        step_history_queryset = (StepHistory.objects
                                                 .filter(study=study)
                                                 .annotate(sample=Coalesce(F('process_measurement__lineage__child'), F('process_measurement__source_sample')))
                                                 .filter(sample=sample.pk))
                        step_history = step_history_queryset.get()
                        step_history.workflow_action = WorkflowAction.DEQUEUE_SAMPLE
                        step_history.save()
            except Exception as err:
                return HttpResponseBadRequest(err)
        if removed and not errors:
            return Response(data={"details": removed}, status=status.HTTP_200_OK)
        else:
            return HttpResponseBadRequest(errors or f"Missing sample-next-step-by-study ID to delete.")

   
    @action(detail=False, methods=["get"])    
    def summary_by_study(self, request):
        """
        Returns the number of samples queued at each step for either a single study or for all
        studies. Pass a comma-separated list of study id's in a 'study__id__in' query parameter
        to specify specific studies.
        
        The endpoint returns an array of objects. Each object contains a study ID and a list
        of steps, where each step includes a count of the number of samples queued.

        For each step, the step order ID, order, step name and count is returned.

        The endpoint only returns steps that have at least one sample queued - steps
        with zero samples are omitted from the results.

        Args:

        Returns:
        Dictionary of step order ID / sample count pairs, one for each step in the study workflow.
        """
       
        study_id = request.GET.get('study__id__in')
    
        samples_in_study = SampleNextStepByStudy.objects.all()
        if study_id is not None:
            samples_in_study = samples_in_study.filter(study__id=study_id)
       
        counted = samples_in_study.values('study__id', 'step_order', 'step_order__order', 'step_order__step__name').annotate(count=Count('step_order')).order_by('study__id', 'step_order__order')

        studies = dict()
        for group in counted:
            studyID = group['study__id']
            if studyID not in studies:
                studies[studyID] = {
                    "study_id": studyID,
                    "steps": []
                }
            studies[studyID]['steps'].append({
                'step_order_id': group['step_order'],
                'order': group['step_order__order'],
                'step_name': group['step_order__step__name'],
                'count': group['count']
            })

        return Response(studies.values())
