
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.models.readset import Readset
from fms_core.serializers import ReadsetSerializer
from fms_core.filters import ReadsetFilter

from ._utils import _list_keys
from ._constants import _readset_filterset_fields

class ReadsetViewSet(viewsets.ModelViewSet):
    queryset = Readset.objects.all()

    serializer_class = ReadsetSerializer

    ordering_fields = (
        *_list_keys(_readset_filterset_fields),
    )

    filterset_class = ReadsetFilter
