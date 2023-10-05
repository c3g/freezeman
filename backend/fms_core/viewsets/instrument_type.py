from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import InstrumentType
from fms_core.serializers import InstrumentTypeSerializer

from ._utils import _list_keys
from ._constants import _instrument_type_filterset_fields

class InstrumentTypeViewSet(viewsets.ModelViewSet):
    queryset = InstrumentType.objects.all().distinct()

    serializer_class = InstrumentTypeSerializer

    ordering_fields = (
        *_list_keys(_instrument_type_filterset_fields),
    )

    filterset_fields = {
        **_instrument_type_filterset_fields,
    }

    ordering = ["type"]
