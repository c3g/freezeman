from datetime import datetime, timedelta
from django.forms import ValidationError
from rest_framework.response import Response
from rest_framework import viewsets
from fms_core.models import ProcessMeasurement, Project, Sample, SampleByProject
import fms_core.services.report as service
from django.db.models import Count, F, Q
from rest_framework.decorators import action
from ._constants import _project_minimal_filterset_fields

class ReportViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["get"])
    def summary(self, request):
        projectId = request.GET.get("project_id")

        project = Project.objects.filter(pk=projectId)

        if project.exists():
            project = project[0]

            response = {}

            end_date = datetime.today()
            start_date = end_date - timedelta(days=300)

            samples_by_project = service.samples_by_project(project, start_date, end_date)

            filters = {
                "all": service.identity,
                "collected": service.is_collected,
                "extracted": service.extracted,
                "library": service.is_library,
            }
            
            for t, f in filters.items():
                samples_by_project_ = f(samples_by_project)

                response[t] = {}
                response[t]["total"] = samples_by_project_.count()

                response[t]["qc"] = {}
                response[t]["qc"]["passed"] = service.annotate_qc(samples_by_project_) \
                                                     .filter(Q(quality_flag=True) & Q(quantity_flag=True)) \
                                                     .count()
                response[t]["qc"]["failed"] = service.annotate_qc(samples_by_project_) \
                                                     .filter(Q(quality_flag=False) | Q(quantity_flag=False)) \
                                                     .count()

                response[t]["kinds"] = {}
                for s in service.annotate_sample_kind(samples_by_project_):
                    key = s.sample_kind_name.lower()
                    prev = response[t]["kinds"].setdefault(key, 0)
                    response[t]["kinds"][key] = prev + 1
            
            return Response(response)
        else:
            raise ValidationError([f"Could not find projects with id {projectId}"])