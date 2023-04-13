from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.models import StepHistory, Study, StepOrder
from fms_core.serializers import StepHistorySerializer

from django.db.models import Count

from ._constants import _stephistory_filterset_fields

class StepHistoryViewSet(viewsets.ModelViewSet):
    queryset = StepHistory.objects.all()
    serializer_class = StepHistorySerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_stephistory_filterset_fields,
    }

   
    @action(detail=False, methods=["get"])    
    def summary_by_study(self, request):
        """
        Retrieve the numbers of completed samples for the steps of one or more studies.
        Pass a `study__id__in` query parameter to specify specific studies.

        Studies can be specified using the study__id__in query parameter. If omitted then the
        endpoint will return counts for all studies.

        For each study, a data structure is returned containing the study ID and an array
        of steps. For each step we return the StepOrder ID, it's order, the step name, and
        the number of samples that have completed that step. Steps are only returned if there
        are one or more completed samples, and are omitted otherwise.
        
        Args:

        Returns:
        An array of studies, where each study contains a list of steps with a sample count.
        """
        study_id = request.GET.get('study__id__in')

        history_query = StepHistory.objects.all()
        if study_id is not None:
            history_query = history_query.filter(study__id = study_id)

        counted = history_query.values('study__id', 'step_order', 'step_order__order', 'step_order__step__name').annotate(count=Count('step_order')).order_by('study__id', 'step_order__order')

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