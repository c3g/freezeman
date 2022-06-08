from datetime import datetime, timedelta
from django.forms import ValidationError
from rest_framework.response import Response
from rest_framework import viewsets
from fms_core.models import ProcessMeasurement, Project, Sample, SampleByProject
import fms_core.services.report as service
from django.db.models import Count, F, Q
from django.contrib.postgres.aggregates import ArrayAgg
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

            sbps = service.samples_by_project(project, start_date, end_date)
            sbps = sbps.annotate(
                child_of_count=Count("child_of"),
                quality_flag=F("quality_flag"),
                quantity_flag=F("quantity_flag"),
            )
            sbps = sbps.aggregate(
                          libraries=ArrayAgg("sample__derived_samples__library"),
                          extractions=ArrayAgg("sample__derived_samples__sample_kind__is_extracted"),
                          sample_kinds=ArrayAgg("sample__derived_samples__sample_kind__name"),
                      )

            filters = {}

            for t in filters:
                response.setdefault(t, {
                            "total": 0,
                            "qc": {
                                "passed": 0,
                                "failed": 0,
                            },
                            "kinds": {}
                        })

            for sbp in sbps:
                for t, f in filters.items():
                    if f(sbp):
                        response[t]["total"] += 1

                        response[t]["qc"]["passed"] += (sbp.quality_flag == True and sbp.quantity_flag == True)
                        response[t]["qc"]["failed"] += (sbp.quality_flag == False or sbp.quantity_flag == False)

                        response[t].setdefault("kinds", {})
                        key = sbp.sample_kind_name.lower()
                        prev = response[t]["kinds"].setdefault(key, 0)
                        response[t]["kinds"][key] = prev + 1
            
            return Response(response)
        else:
            raise ValidationError([f"Could not find projects with id {projectId}"])