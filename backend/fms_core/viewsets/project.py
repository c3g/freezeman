from collections import Counter

from django.db.models import Count

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import Project
from fms_core.serializers import ProjectSerializer, ProjectExportSerializer
from fms_core.filters import ProjectFilter
from fms_core.resources import ProjectLinkSampleResource
from fms_core.template_paths import PROJECT_LINK_SAMPLES_TEMPLATE

from ._utils import TemplateActionsMixin, _list_keys, versions_detail
from ._constants import _project_filterset_fields


class ProjectViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_class = ProjectFilter
    ordering_fields = (
        *_list_keys(_project_filterset_fields),
    )

    template_action_list = [
        {
            "name": "Link Projects with Samples",
            "description": "Upload the provided template with links between projects and samples.",
            "template": PROJECT_LINK_SAMPLES_TEMPLATE,
            "resource": ProjectLinkSampleResource,
        }
    ]

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = ProjectExportSerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = ProjectExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of projects in the
        database.
        """
        return Response({
            "total_count": Project.objects.all().count(),
            "ongoing_count": Project.objects.all().filter(status='Ongoing').count(),
            "completed_count": Project.objects.all().filter(status="Completed").count(),
        })