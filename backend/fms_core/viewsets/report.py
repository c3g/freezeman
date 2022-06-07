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

            response = {
                "new_sample_count": 0,
                "extraction_count": 0,
                "extracted_samples_count": {},
                "qc": {
                    "awaiting": 0,
                    "failed": 0,
                    "passed": 0,
                },
                "libraries_prepared_count": 0
            }

            end_date = datetime.today()
            start_date = end_date - timedelta(days=300)

            samples_by_project = service.samples_by_project(project, start_date, end_date)
            samples = Sample.objects.filter(id__in=samples_by_project.values_list('sample_id', flat=True))
            samples_extracted = service.extracted_samples(samples)

            response["new_sample_count"] = service.root_samples(samples).count()
            response["extraction_count"] = samples_extracted.count()
            response["libraries_prepared_count"] = service.samples_with_libraries(samples).count()

            with_sample_kinds = service.annotate_sample_kind(samples_extracted)
            for s in with_sample_kinds:
                key = s.sample_kind_names.lower()
                response["extracted_samples_count"].setdefault(key, 0)
                response["extracted_samples_count"][key] += 1

            response["qc"]["awaiting"] = samples_extracted.filter(Q(quality_flag=None) & Q(quantity_flag=None)).count()
            response["qc"]["passed"] = samples_extracted.filter(Q(quality_flag=True) & Q(quantity_flag=True)).count()
            response["qc"]["failed"] = samples_extracted.filter(Q(quality_flag=False) | Q(quantity_flag=False)).count()
            
            return Response(response)
        else:
            raise ValidationError([f"Could not find projects with id {projectId}"])