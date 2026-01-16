
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from fms_core.models import FreezemanPermissionByUser
from fms_core.serializers import FreezemanPermissionByUserSerializer

from ._utils import _list_keys
from ._constants import _permission_by_user_filterset_fields


class PermissionByUserViewSet(viewsets.ModelViewSet):
    queryset = FreezemanPermissionByUser.objects.all()
    serializer_class = FreezemanPermissionByUserSerializer

    filterset_fields = {
        **_permission_by_user_filterset_fields,
    }

    ordering_fields = (
        *_list_keys(_permission_by_user_filterset_fields),
    )

    ordering = ["id"]

    def get_permissions(self):
        if self.action == "partial_update" or self.action == "update" or self.action == "create" or self.action == "destroy":
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]