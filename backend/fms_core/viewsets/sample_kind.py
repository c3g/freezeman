from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import SampleKind
from fms_core.serializers import SampleKindSerializer


class SampleKindViewSet(viewsets.ModelViewSet):
    queryset = SampleKind.objects.all()
    serializer_class = SampleKindSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]