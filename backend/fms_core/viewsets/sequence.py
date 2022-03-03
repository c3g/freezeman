from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import Sequence
from fms_core.serializers import SequenceSerializer

from ._constants import _sequence_filterset_fields


class SequenceViewSet(viewsets.ModelViewSet):
    queryset = Sequence.objects.all()
    serializer_class = SequenceSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_sequence_filterset_fields,
    }