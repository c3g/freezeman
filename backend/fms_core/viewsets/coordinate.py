from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import Coordinate
from fms_core.serializers import CoordinateSerializer

from ._constants import _coordinate_filterset_fields


class CoordinateViewSet(viewsets.ModelViewSet):
    queryset = Coordinate.objects.all()
    serializer_class = CoordinateSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_coordinate_filterset_fields,
    }