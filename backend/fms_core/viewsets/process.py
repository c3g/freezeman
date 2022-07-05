from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from fms_core.models import Process
from fms_core.serializers import ProcessSerializer

from ._constants import _process_filterset_fields

class ProcessViewSet(viewsets.ModelViewSet):
    queryset = Process.objects.all().select_related("imported_template")
    serializer_class = ProcessSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_process_filterset_fields,
    }