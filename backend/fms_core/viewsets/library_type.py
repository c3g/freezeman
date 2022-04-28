from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import LibraryType
from fms_core.serializers import LibraryTypeSerializer

from ._constants import _library_type_filterset_fields


class LibraryTypeViewSet(viewsets.ModelViewSet):
    queryset = LibraryType.objects.all()
    serializer_class = LibraryTypeSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_library_type_filterset_fields,
    }