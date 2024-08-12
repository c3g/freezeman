from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from django.core.exceptions import ValidationError

from fms_core.utils import make_generator
from fms_core.services.project import add_sample_to_study
from fms_core.models import Project, Sample
from fms_core.serializers import ProjectSerializer, ProjectExportSerializer
from fms_core.template_importer.importers import ProjectStudyLinkSamples
from fms_core.templates import PROJECT_STUDY_LINK_SAMPLES_TEMPLATE

from ._utils import TemplateActionsMixin, _list_keys
from ._constants import _project_filterset_fields


class ProjectViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Project.objects.all().distinct()
    serializer_class = ProjectSerializer

    ordering_fields = (
        *_list_keys(_project_filterset_fields),
    )

    filterset_fields = {
        **_project_filterset_fields,
    }

    ordering = ["-status", "name"]

    template_action_list = [
        {
            "name": "Link Projects and Studies with Samples",
            "description": "Upload the provided template with links between projects, studies and samples.",
            "template": [PROJECT_STUDY_LINK_SAMPLES_TEMPLATE["identity"]],
            "importer": ProjectStudyLinkSamples,
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
            "total_count": Project.objects.count(),
            "open_count": Project.objects.filter(status="Open").count(),
            "closed_count": Project.objects.filter(status="Closed").count(),
        })
    
    @action(detail=False, methods=["post"])
    def add_samples_to_study(self, request, pk=None):
        sample_ids = request.data.get("sample_ids")
        project_id = request.data.get("project_id")
        study_letter = request.data.get("study_letter")
        step_order = request.data.get("step_order", None)
        samples =  make_generator(Sample.objects.filter(id__in=sample_ids))
        project = Project.objects.get(id=project_id)
        errors = {}
        warnings = {}
        for sample in samples:
            errors, warnings = add_sample_to_study(sample, project, study_letter, step_order)
            if errors:
                raise ValidationError(errors)
        return Response({
            "warnings": warnings
        })