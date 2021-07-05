from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from ._utils import TemplateActionsMixin

from fms_core.models import ExperimentRun
from fms_core.serializers import ExperimentRunSerializer
from fms_core.resources import ExperimentRunResource
from fms_core.template_paths import EXPERIMENT_INFINIUM_TEMPLATE


class ExperimentRunViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = ExperimentRun.objects.select_related("experiment_type", "container", "instrument")
    serializer_class = ExperimentRunSerializer
    pagination_class = None

    permission_classes = [IsAuthenticated]

    template_action_list = [
        {
            "name": "Experiment Run",
            "description": "Upload the provided template with experiment run information.",
            "template": EXPERIMENT_INFINIUM_TEMPLATE,
            "resource": ExperimentRunResource,
        },
    ]
