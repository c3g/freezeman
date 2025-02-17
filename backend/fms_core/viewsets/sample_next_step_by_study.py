from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from django.http import HttpResponseBadRequest, QueryDict
from django.db.models import Count, F, Case, When, Q, BooleanField
from fms_core.models.step_order import StepOrder
from fms_core.filters import SampleNextStepByStudyFilter
from fms_core.models.workflow import Workflow

from ._constants import _sample_next_step_by_study_filterset_fields
from fms_core._constants import WorkflowAction
from fms_core.models import SampleNextStepByStudy, Sample, Study, StepHistory
from fms_core.services.sample_next_step import dequeue_sample_from_specific_step_study_workflow_with_updated_last_step_history
from fms_core.serializers import SampleNextStepByStudySerializer
from ._utils import _list_keys

class SampleNextStepByStudyViewSet(viewsets.ModelViewSet):
    queryset = SampleNextStepByStudy.objects.select_related("sample_next_step").select_related("step_order").all().distinct()

    queryset = queryset.annotate(
        qc_flag=Case(
            When(Q(sample_next_step__sample__quality_flag=False) | Q(sample_next_step__sample__quantity_flag=False), then=False),
            When(Q(sample_next_step__sample__quality_flag=True) | Q(sample_next_step__sample__quantity_flag=True), then=True),
            default=None,
            output_field=BooleanField()
        )
    )

    serializer_class = SampleNextStepByStudySerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_sample_next_step_by_study_filterset_fields
    }
    ordering_fields = {
        *_list_keys( _sample_next_step_by_study_filterset_fields),
        'qc_flag'
    }

    ordering = ["id"]

    filterset_class = SampleNextStepByStudyFilter

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
                    removed, errors, _ = dequeue_sample_from_specific_step_study_workflow_with_updated_last_step_history(sample, study, order)
            except Exception as err:
                return HttpResponseBadRequest(err)
        if removed and not errors:
            return Response(data={"details": removed}, status=status.HTTP_200_OK)
        else:
            return HttpResponseBadRequest(errors or f"Missing sample-next-step-by-study ID to delete.")

    @action(detail=False, methods=["post"])
    def destroy_list(self, request):
        sample_ids = request.data.get("sample_ids", [])
        study = request.data.get("study", None)
        stepOrder = request.data.get("step_order", None)
        if sample_ids == []:
            return HttpResponseBadRequest("No sample IDs provided.")
        if study is None:
            return HttpResponseBadRequest("No study ID provided.")
        if stepOrder is None:
            return HttpResponseBadRequest("No step order provided.")
        queryset = self.get_queryset().filter(sample_next_step__sample__id__in=sample_ids, study=study, step_order__order=stepOrder)
        values_list = queryset.values_list("sample_next_step__sample", "study", "step_order__order")
        errors = []
        removed = {}
        try:
            sample_by_id: dict[int, Sample] = {sample_id: None for sample_id, _, _ in values_list}
            study_by_id: dict[int, Study] = {study_id: None for _, study_id, _ in values_list}
            for sample_id, study_id, order in values_list:
                if sample_by_id[sample_id] is None:
                    sample_by_id[sample_id] = Sample.objects.get(id=sample_id)
                if study_by_id[study_id] is None:
                    study_by_id[study_id] = Study.objects.get(id=study_id)
            with transaction.atomic():
                for sample_id, study_id, order in values_list:
                    sample = sample_by_id[sample_id]
                    study = study_by_id[study_id]
                    newremoved, newerrors, _ = dequeue_sample_from_specific_step_study_workflow_with_updated_last_step_history(sample, study, order)
                    errors.extend(newerrors)
                    removed[sample_id] = newremoved
                if errors:
                    raise IntegrityError(errors, removed)
        except Exception as err:
            return ValidationError(err)
        return Response(data=[int(k) for k in removed], status=status.HTTP_200_OK)

   
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
