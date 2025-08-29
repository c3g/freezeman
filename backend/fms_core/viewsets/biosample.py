from rest_framework import viewsets
from django.db.models import Subquery, OuterRef
from fms_core.models import Metric, Biosample
from fms_core.serializers import BiosampleSerializer
from ._constants import _biosample_filterset_fields

from ._utils import _list_keys

class BiosampleViewSet(viewsets.ModelViewSet):
    queryset = Biosample.objects.all()
    serializer_class = BiosampleSerializer

    ordering_fields = (
        *_list_keys(_biosample_filterset_fields),
    )

    filterset_fields = {
        **_biosample_filterset_fields
    }
    ordering = ["-id"]


