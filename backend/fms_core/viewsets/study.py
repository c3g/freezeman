from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import Study
from fms_core.serializers import StudySerializer

from ._constants import _study_filterset_fields

class StudyViewSet(viewsets.ModelViewSet):
    queryset = Study.objects.all()
    serializer_class = StudySerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_study_filterset_fields,
    }