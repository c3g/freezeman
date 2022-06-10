from datetime import datetime, timedelta
from django.db.models.query import QuerySet
from django.forms import ValidationError
from rest_framework.response import Response
from rest_framework import viewsets
from fms_core.models import ProcessMeasurement, Project, Sample, SampleByProject, DerivedSample
import fms_core.services.report as service
from django.db.models import Count, F, Q
from rest_framework.decorators import action

def samples_by_project(project: Project) -> QuerySet[SampleByProject]:
    return SampleByProject.objects.filter(project=project)

def derived_samples(sbps: QuerySet[SampleByProject]) -> QuerySet[DerivedSample]:
    ds_ids = sbps.values_list("sample__derived_samples", flat=True)
    dss = DerivedSample.objects.filter(id__in=ds_ids)
    return dss

def count_biosamples(dss: QuerySet[DerivedSample]) -> int:
    return dss.values_list("biosample", flat=True).distinct().count()

class ReportViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["get"])
    def summary(self, request):
        projectId = request.GET.get("project_id")

        project = Project.objects.filter(pk=projectId).first()

        if project:

            sbps = samples_by_project(project)

            dss = derived_samples(sbps)

            response = {}
            response["total"] = count_biosamples(dss)
            response["extracted"] = count_biosamples(dss.filter(sample_kind__is_extracted=True))
            response["libraried"] = count_biosamples(dss.filter(~Q(library=None)))

            return Response(response)
        else:
            raise ValidationError([f"Could not find projects with id '{projectId}'"])
