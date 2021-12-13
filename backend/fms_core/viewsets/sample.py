from rest_framework import viewsets
from rest_framework.decorators import action

from fms_core.models import Sample
from fms_core.serializers import SampleSerializer

from ._utils import TemplateActionsMixin, _list_keys, versions_detail
from ._constants import _sample_filterset_fields


class SampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Sample.objects.select_related("container").prefetch_related("process_measurement", "projects").all().distinct()
    serializer_class = SampleSerializer

    ordering_fields = (
        *_list_keys(_sample_filterset_fields),
    )

    filterset_fields = {
        **_sample_filterset_fields,
    }

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, _request, pk=None):
        return versions_detail(self.get_object())

