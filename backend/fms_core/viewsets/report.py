from datetime import datetime, timedelta
from django.db.models.query import QuerySet
from django.forms import ValidationError
from rest_framework.response import Response
from rest_framework import viewsets
from fms_core.models import ProcessMeasurement, Project, Sample, SampleByProject, DerivedSample
import fms_core.services.report as service
from django.db.models import Count, F, Q
from rest_framework.decorators import action

def samples(sbps: QuerySet[SampleByProject]) -> QuerySet[Sample]:
    s_ids = sbps.values_list("sample", flat=True)
    ss = Sample.objects.filter(id__in=s_ids)
    return ss

def derived_samples(ss: QuerySet[Sample]) -> QuerySet[DerivedSample]:
    ds_ids = ss.values_list("derived_samples", flat=True)
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
            sbps = SampleByProject.objects.filter(project=project)

            ss = samples(sbps)
            dss = derived_samples(ss)

            pms = ProcessMeasurement.objects.filter(source_sample__in=ss)
            extractions = pms.filter(process__protocol__name__icontains="extraction")
            libration = pms.filter(process__protocol__name__icontains="library")

            response = {}

            # biosample
            response["biosample"] = {
                "total": count_biosamples(dss),
                "extracted": count_biosamples(dss.filter(sample_kind__is_extracted=True)),
                "libraried": count_biosamples(dss.filter(~Q(library=None))),
            }

            # process measurement
            response["protocol"] = {
                "total": pms.count(),
                "extraction": {
                    "total": extractions.count(),
                },
                "library": libration.count(),
            }

            for name in extractions.annotate(dcount=Count("lineage__child__derived_samples")).filter(dcount__lte=1).values_list("lineage__child__derived_samples__sample_kind__name", flat=True):
                response["protocol"]["extraction"].setdefault(name, 0)
                response["protocol"]["extraction"][name] += 1

            return Response(response)
        else:
            raise ValidationError([f"Could not find projects with id '{projectId}'"])
