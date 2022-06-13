from datetime import datetime, timedelta
from django.db.models.query import QuerySet
from django.forms import ValidationError
from rest_framework.response import Response
from rest_framework import viewsets
from fms_core.models import ProcessMeasurement, Project, Sample, SampleByProject, DerivedSample
import fms_core.services.report as service
from django.db.models import Count, F, Q
from rest_framework.decorators import action

class ReportViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["get"])
    def summary(self, request):
        projectId = request.GET.get("project_id")

        project = Project.objects.filter(pk=projectId).first()

        if project:
            sbps = service.samples_by_project(project)

            ss = service.sample_by_project__sample(sbps)
            dss = service.sample__derived_samples(ss)

            pms = service.process_measurements(ss)
            extractions = service.process_measurement__process__protocol__name__icontains(pms, "extraction")
            libration = service.process_measurement__process__protocol__name__icontains(pms, "library")

            response = {}

            response["biosample"] = {
                "total": service.derived_sample__biosample__count(dss),
                "extraction":service.derived_sample__biosample__count(dss.filter(sample_kind__is_extracted=True)),
                "library":service.derived_sample__biosample__count(dss.filter(~Q(library=None))),
            }

            response["protocol"] = {
                "total": pms.count(),
                "extraction": {
                    "total": extractions.count(),
                },
                "library": libration.count(),
            }

            sample_kind_names = service.process_measurement_lineage__child__derived_samples__sample_kind__name(pms)
            for name in sample_kind_names:
                response["protocol"]["extraction"].setdefault(name, 0)
                response["protocol"]["extraction"][name] += 1

            response["user"] = {}
            for username, protocol in pms.values_list("created_by__username", "process__protocol__name"):
                response["user"].setdefault(username, {})
                response["user"][username].setdefault(protocol, 0)
                response["user"][username][protocol] += 1

            return Response(response)
        else:
            raise ValidationError([f"Could not find projects with id '{projectId}'"])
