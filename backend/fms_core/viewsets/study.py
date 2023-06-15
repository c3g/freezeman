from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from fms_core.models import Study, Project, Workflow, StepHistory, SampleNextStep, SampleNextStepByStudy
from fms_core.serializers import StudySerializer
from fms_core.services.study import create_study, can_remove_study

from django.core.exceptions import ValidationError
from django.http import HttpResponse

from collections import defaultdict

from ._constants import _study_filterset_fields

class StudyViewSet(viewsets.ModelViewSet):
    queryset = Study.objects.all()
    serializer_class = StudySerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_study_filterset_fields,
    }

    def create(self, request, *args, **kwargs):
        errors = defaultdict(list)
        study_data = request.data

        try:
            if study_data['project']:
                project = Project.objects.get(id=study_data['project'])
            else:
                project = None
        except Project.DoesNotExist:
            errors['project'].append(f"Project with id {study_data['project']} does not exist.")

        try:
            if study_data['workflow']:
                workflow = Workflow.objects.get(id=study_data['workflow'])
            else:
                workflow = None
        except Workflow.DoesNotExist:
            errors['workflow'].append(f"Workflow with id {study_data['workflow']} does not exist.")

        if not any(bool(error) for error in errors.values()): 
            # Call create study service
            study, errors_service, _ = create_study(project=project,
                                                    workflow=workflow,
                                                    start=study_data['start'],
                                                    end=study_data['end'])

            for key, value in errors_service.items():
                errors[key].append(value)

        if any(bool(error) for error in errors.values()):
            raise ValidationError(errors)
        else: 
            # Serialize study
            serializer = StudySerializer(study)
            return Response(serializer.data)

    def destroy(self, request, pk=None):
        errors = defaultdict(list)

        if pk is None:
            errors['Study'].append("pk cannot be None")
        else:
            _, errors['Removable'], _ = can_remove_study(pk)

        if any(bool(error) for error in errors.values()):
            raise ValidationError(errors)
        else:
            study = Study.objects.filter(pk=pk).first()
            if study:
                study.delete()
                return HttpResponse('Successfully removed the study', status=status.HTTP_200_OK)
            else:
                return HttpResponse(f"Could not find study with id '{pk}'.", status=status.HTTP_404_NOT_FOUND)

