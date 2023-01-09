from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import ReferenceGenome
from fms_core.serializers import ReferenceGenomeSerializer

from ._constants import _reference_genome_filterset_fields


class ReferenceGenomeViewSet(viewsets.ModelViewSet):
    queryset = ReferenceGenome.objects.all()
    serializer_class = ReferenceGenomeSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_reference_genome_filterset_fields,
    }