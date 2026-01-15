
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import FreezemanPermission
from fms_core.serializers import FreezemanPermissionSerializer

from ._utils import _list_keys
from ._constants import _permission_filterset_fields


class PermissionViewSet(viewsets.ModelViewSet):
    queryset = FreezemanPermission.objects.all()
    serializer_class = FreezemanPermissionSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_permission_filterset_fields,
    }

    ordering_fields = (
        *_list_keys(_permission_filterset_fields),
    )

    ordering = ["name"]