from rest_framework import viewsets
from reversion.models import Revision

from fms_core.serializers import RevisionSerializer

from ._constants import FK_FILTERS


class RevisionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Revision.objects.all()
    serializer_class = RevisionSerializer
    filterset_fields = {
        "user_id": FK_FILTERS,
    }