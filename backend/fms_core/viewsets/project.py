from collections import Counter

from django.db.models import Count, Q

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import Project
from fms_core.serializers import ProjectSerializer, ProjectExportSerializer

from ._utils import TemplateActionsMixin, _list_keys, versions_detail
from ._constants import _project_filterset_fields


class ProjectViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    ordering_fields = (
        *_list_keys(_project_filterset_fields),
    )

    filterset_fields = {
        **_project_filterset_fields,
    }

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
    def search(self, _request):
        """
        Searches for projects that match the given query
        """
        search_input = _request.GET.get("q")

        query = Q(name__icontains=search_input)
        query.add(Q(id__icontains=search_input), Q.OR)

        projects_data = Project.objects.filter(query)
        page = self.paginate_queryset(projects_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)

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