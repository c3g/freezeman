from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import Platform
from fms_core.serializers import PlatformSerializer

from ._constants import _platform_filterset_fields


class PlatformViewSet(viewsets.ModelViewSet):
    queryset = Platform.objects.all()
    serializer_class = PlatformSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_platform_filterset_fields,
    }