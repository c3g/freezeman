from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError
from django.http import HttpResponseBadRequest

from ._constants import _sample_next_step_by_study_filterset_fields
from fms_core.models import SampleNextStepByStudy, Sample, Study
from fms_core.services.sample_next_step import dequeue_sample_from_specific_step_study_workflow
from fms_core.serializers import SampleNextStepByStudySerializer

class SampleNextStepByStudyViewSet(viewsets.ModelViewSet):
    queryset = SampleNextStepByStudy.objects.select_related("sample_next_step").select_related("step_order").all()
    serializer_class = SampleNextStepByStudySerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_sample_next_step_by_study_filterset_fields
    }

    def destroy(self, request, pk=None):
        removed = False
        errors = []
        if pk is not None:
            try:
                values_list = self.filter_queryset(self.get_queryset()).values_list("sample_next_step__sample", "study", "step_order__order")
                for sample_id, study_id, order in values_list:
                    sample = Sample.objects.get(id=sample_id)
                    study = Study.objects.get(id=study_id)
                    removed, errors, _ = dequeue_sample_from_specific_step_study_workflow(sample, study, order)
            except Exception as err:
                raise ValidationError(err)
        if removed:
            return Response(data=removed, status=status.HTTP_200_OK)
        else:
            return HttpResponseBadRequest(errors)