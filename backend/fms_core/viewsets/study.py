from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from fms_core.models import Study
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

        # Call create study service
        study, errors, warnings = create_study(letter=letter,
                                               project=study_data['project'],
                                               worfklow=study_data['worfklow'],
                                               start=study_data['start'],
                                               end=study_data['end'],
                                               reference_genome=study_data['reference_genome'])

        if errors:
            raise ValidationError(err)
        else: 
            # Serialize study
            serializer = StudySerializer(study)
            return Response(serializer.data)