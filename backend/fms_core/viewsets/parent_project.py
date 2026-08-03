from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import ParentProject
from fms_core.serializers import ParentProjectSerializer

from ._utils import _list_keys
from ._constants import _parent_project_filterset_fields


class ParentProjectViewSet(viewsets.ModelViewSet):
    queryset = ParentProject.objects.all()
    serializer_class = ParentProjectSerializer
    permission_classes = [IsAuthenticated]

    ordering_fields = (
        *_list_keys(_parent_project_filterset_fields),
    )

    filterset_fields = {
        **_parent_project_filterset_fields,
    }

    ordering = ["external_id"]