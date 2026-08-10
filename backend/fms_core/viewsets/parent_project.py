from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from fms_core.models import ParentProject
from fms_core.queries.parent_project.readsets import (
    get_parent_project_readsets_queryset,
)
from fms_core.serializers import ParentProjectReadsetSerializer, ParentProjectSerializer

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


    @action(detail=True, methods=["get"])
    def readsets(self, request, pk=None):
        parent_project = self.get_object()

        queryset = get_parent_project_readsets_queryset(parent_project)
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = ParentProjectReadsetSerializer(page,many=True,)
            return self.get_paginated_response(serializer.data)

        else:

            serializer = ParentProjectReadsetSerializer(queryset,many=True,)
            return Response(serializer.data)

