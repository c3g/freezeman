from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from django.db.models import F

from fms_core.models import Study
from fms_core.serializers import StudySerializer

from ._utils import _list_keys
from ._constants import _study_filterset_fields


class StudyViewSet(viewsets.ModelViewSet):
    queryset = Study.objects.all().distinct()
    serializer_class = StudySerializer

    ordering_fields = (
        *_list_keys(_study_filterset_fields),
    )

    filterset_fields = {
        **_study_filterset_fields,
    }

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = StudySerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of studies in the
        database.
        """
        return Response({
            "total_count": Study.objects.count(),
        })