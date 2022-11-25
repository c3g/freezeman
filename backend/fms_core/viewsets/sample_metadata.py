from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import SampleMetadata
from fms_core.serializers import SampleMetadataSerializer

from ._constants import _sample_metadata_filterset_fields
from ._constants import FK_FILTERS

class SampleMetadataViewSet(viewsets.ModelViewSet):
    queryset = SampleMetadata.objects.all()
    serializer_class = SampleMetadataSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_sample_metadata_filterset_fields
    }

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for metadata that match the given query
        """
        search_input = _request.GET.get("q")

        metadata_data = SampleMetadata.objects.filter(name__icontains=search_input).distinct().values('name')
        return Response(metadata_data)