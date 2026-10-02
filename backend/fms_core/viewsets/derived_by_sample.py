from rest_framework import viewsets
from fms_core.models import DerivedBySample
from fms_core.serializers import DerivedBySampleSerializer
from ._constants import _derived_by_sample_filterset_fields

from ._utils import _list_keys

class DerivedBySampleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DerivedBySample.objects.all()
    serializer_class = DerivedBySampleSerializer

    ordering_fields = (
        *_list_keys(_derived_by_sample_filterset_fields),
    )

    filterset_fields = {
        **_derived_by_sample_filterset_fields
    }
    ordering = ["id"]
