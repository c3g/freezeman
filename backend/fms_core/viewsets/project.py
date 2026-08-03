from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from django.db.models import F
from django.db import transaction
from django.core.exceptions import ValidationError

from fms_core.models import Project, ParentProject
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

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        full_project_data = request.data
        parent_project_obj = None
        project_obj = None

        try:
            if full_project_data.get("external_id") is not None:
                parent_project_obj = ParentProject.objects.filter(external_id=full_project_data["external_id"]).first()
                if parent_project_obj is None and full_project_data.get("external_name") is not None:
                    parent_project_obj = ParentProject.objects.create(external_id=full_project_data["external_id"], name=full_project_data["external_name"])
        
            project_obj = Project.objects.create(name=full_project_data['name'],
                                                 principal_investigator=full_project_data['principal_investigator'],
                                                 requestor_name=full_project_data['requestor_name'],
                                                 requestor_email=full_project_data['requestor_email'],
                                                 targeted_end_date=full_project_data['targeted_end_date'],
                                                 status=full_project_data['status'],
                                                 comment=full_project_data['comment'],
                                                 parent_project=parent_project_obj)

        except ValidationError as err:
            transaction.set_rollback(True)
            raise ValidationError(err)

        # Serialize full project using the created project
        try:
            serializer = self.get_serializer_class()(project_obj, data=full_project_data)
            serializer.is_valid(raise_exception=True)
        except Exception as err:
            transaction.set_rollback(True)
            raise ValidationError(err)

        return Response(serializer.data)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        full_project_data = request.data
        parent_project_obj = None
        project_obj = None
        project_data = {}

        # Prepare updated data
        try:
            if full_project_data.get("external_id") is not None:
                parent_project_obj = ParentProject.objects.filter(external_id=full_project_data["external_id"]).first()
                # Case project is associated to a new Parent Project
                if parent_project_obj is None and full_project_data.get("external_name") is not None:
                    parent_project_obj = ParentProject.objects.create(external_id=full_project_data["external_id"], name=full_project_data["external_name"])

            project_data = dict(
                name=full_project_data['name'],
                **(dict(principal_investigator=full_project_data['principal_investigator']) if full_project_data['principal_investigator'] is not None else dict()),
                **(dict(requestor_name=full_project_data['requestor_name']) if full_project_data['requestor_name'] is not None else dict()),
                **(dict(requestor_email=full_project_data['requestor_email']) if full_project_data['requestor_email'] is not None else dict()),
                **(dict(targeted_end_date=full_project_data['targeted_end_date']) if full_project_data['targeted_end_date'] is not None else dict()),
                **(dict(status=full_project_data['status']) if full_project_data['status'] is not None else dict()),
                **(dict(comment=full_project_data['comment']) if full_project_data['comment'] is not None else dict()),
                **(dict(parent_project_id=parent_project_obj.id) if parent_project_obj is not None else dict())
            )
        except Exception as err:
            raise ValidationError(err)

        # Retrieve the project to update
        try:
            project_to_update = Project.objects.select_for_update().get(pk=full_project_data['id'])
            project_to_update.__dict__.update(project_data)
        except Exception as err:
            raise ValidationError(dict(non_field_errors=err))

        # Save the updated project
        try:
            project_to_update.save()
        except Exception as err:
            raise ValidationError(err)

        # Return updated project
        # Serialize full project using the created project
        try:
            serializer = self.get_serializer_class()(project_to_update, data=project_data)
            serializer.is_valid(raise_exception=True)
        except Exception as err:
            transaction.set_rollback(True)
            raise ValidationError(err)

        return Response(serializer.data)

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
