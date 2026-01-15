
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import FreezemanPermissionByUser
from fms_core.serializers import FreezemanPermissionByUserSerializer

from ._utils import _list_keys
from ._constants import _permission_by_user_filterset_fields


class PermissionByUserViewSet(viewsets.ModelViewSet):
    queryset = FreezemanPermissionByUser.objects.all()
    serializer_class = FreezemanPermissionByUserSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_permission_by_user_filterset_fields,
    }

    ordering_fields = (
        *_list_keys(_permission_by_user_filterset_fields),
    )

    ordering = ["id"]
