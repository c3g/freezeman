from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from fms_core.models import Study, Project, Workflow, ReferenceGenome
from fms_core.serializers import StudySerializer
from fms_core.services.study import create_study
from django.core.exceptions import ValidationError

import string

from ._constants import _study_filterset_fields

class StudyViewSet(viewsets.ModelViewSet):
    queryset = Study.objects.all()
    serializer_class = StudySerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_study_filterset_fields,
    }

    def create(self, request, *args, **kwargs):
        study_data = request.data

        # Generate a sequential letter by counting the number of existing studies tied to the provided project
        study_count = Study.objects.filter(project=study_data['project']).count()
        letter = string.ascii_uppercase[study_count]

        try:
            project = Project.objects.get(id=study_data['project'])
        except Project.DoesNotExist:
            errors['project'] = f"Project with id {study_data['project']} does not exists."

        try:
            workflow = Workflow.objects.get(id=study_data['workflow'])
        except Workflow.DoesNotExist:
            errors['workflow'] = f"Workflow with id {study_data['workflow']} does not exists."

        try:
            reference_genome = ReferenceGenome.objects.get(id=study_data['reference_genome'])
        except ReferenceGenome.DoesNotExist:
            errors['reference_genome'] = f"Reference genome with id {study_data['reference_genome']} does not exists."

        # Call create study service
        study, errors, warnings = create_study(letter=letter,
                                               project=project,
                                               workflow=workflow,
                                               start=study_data['start'],
                                               end=study_data['end'],
                                               reference_genome=reference_genome)

        if errors:
            raise ValidationError(errors)
        else: 
            # Serialize study
            serializer = StudySerializer(study)
            return Response(serializer.data)