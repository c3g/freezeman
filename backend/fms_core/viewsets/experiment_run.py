from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from ._utils import TemplateActionsMixin

from fms_core.models import ExperimentRun
from fms_core.serializers import ExperimentRunSerializer


class ExperimentRunViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = ExperimentRun.objects.select_related("experiment_type", "container", "instrument")
    serializer_class = ExperimentRunSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]