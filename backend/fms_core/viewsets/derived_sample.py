from rest_framework import viewsets
from fms_core.models import DerivedSample
from fms_core.serializers import DerivedSampleSerializer
from ._constants import _derived_sample_filterset_fields

from ._utils import _list_keys

class DerivedSampleViewSet(viewsets.ModelViewSet):
    queryset = DerivedSample.objects.all().distinct()
    serializer_class = DerivedSampleSerializer

    ordering_fields = (
        *_list_keys(_derived_sample_filterset_fields),
    )

    filterset_fields = {
        **_derived_sample_filterset_fields
    }
    ordering = ["-id"]
