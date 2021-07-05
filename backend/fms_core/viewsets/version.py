from rest_framework import viewsets
from reversion.models import Version

from fms_core.serializers import VersionSerializer

from ._constants import FK_FILTERS, CATEGORICAL_FILTERS, DATE_FILTERS


class VersionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Version.objects.all().prefetch_related("content_type", "revision")
    serializer_class = VersionSerializer
    filterset_fields = {
        "object_id": FK_FILTERS,

        # Content type filters
        "content_type__id": FK_FILTERS,
        "content_type__app_label": CATEGORICAL_FILTERS,
        "content_type__model": CATEGORICAL_FILTERS,

        # Revision filters
        "revision__id": FK_FILTERS,
        "revision__date_created": DATE_FILTERS,
        "revision__user": ["exact"],
    }