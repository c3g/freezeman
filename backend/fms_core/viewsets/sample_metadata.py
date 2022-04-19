from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import SampleMetadata
from fms_core.serializers import SampleMetadataSerializer

from ._constants import _sample_metadata_filterset_fields

class SampleMetadataViewSet(viewsets.ModelViewSet):
    queryset = SampleMetadata.objects.all()
    serializer_class = SampleMetadataSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_sample_metadata_filterset_fields
    }