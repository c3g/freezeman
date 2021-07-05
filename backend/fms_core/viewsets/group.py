from rest_framework import viewsets
from django.contrib.auth.models import Group
from fms_core.serializers import GroupSerializer
from ._constants import _group_filterset_fields

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    filterset_fields = _group_filterset_fields
