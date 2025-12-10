from fms_core.models import SampleIdentityMatch

from fms_core.serializers import SampleIdentityMatchSerializer

from rest_framework import viewsets

from ._utils import _list_keys
from ._constants import _sample_identity_match_filterset_fields

class SampleIdentityMatchViewSet(viewsets.ModelViewSet):
    queryset = SampleIdentityMatch.objects.select_related("tested__biosample_id").select_related("matched__biosample_id").all().distinct()
    serializer_class = SampleIdentityMatchSerializer
    ordering_fields = (
        *_list_keys(_sample_identity_match_filterset_fields),
    )

    filterset_fields = {
        **_sample_identity_match_filterset_fields
    }
    ordering = ["id"]