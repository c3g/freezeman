from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import PropertyValue
from fms_core.serializers import PropertyValueSerializer

from ._constants import FK_FILTERS, PK_FILTERS, CATEGORICAL_FILTERS

class PropertyValueViewSet(viewsets.ModelViewSet):
    queryset = PropertyValue.objects.all()
    serializer_class = PropertyValueSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        "id": PK_FILTERS,
        "object_id": FK_FILTERS,
        # Content type filters
        "content_type": FK_FILTERS,
        "content_type__app_label": CATEGORICAL_FILTERS,
        "content_type__model": CATEGORICAL_FILTERS,
    }