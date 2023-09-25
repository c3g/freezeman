from django.db.models import Q, F, Case, When, IntegerField

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import Protocol, ProcessMeasurement
from fms_core.serializers import ProtocolSerializer

class ProtocolViewSet(viewsets.ModelViewSet):
    queryset = Protocol.objects.all()
    serializer_class = ProtocolSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

    ordering = ["name"]

    @action(detail=False, methods=["get"])
    def last_protocols(self, _request):
        samples = [int(x) for x in self.request.query_params.get("samples").split(",")]
        queryset = (ProcessMeasurement.objects
                    .annotate(child_sample=F("lineage__child"))
                    .annotate(protocol=F('process__protocol__name'))
                    .annotate(sample_result=Case(When(Q(source_sample__in=samples) & Q(child_sample=None), then=F('source_sample')), # QC?
                                                 When(Q(child_sample__in=samples), then=F('child_sample')), # child?
                                                 default=None,
                                                 output_field=IntegerField()))
                    .exclude(sample_result=None)
                    .order_by('sample_result', '-pk')
                    .distinct('sample_result')
                    .values('sample_result', 'protocol'))
        return Response(queryset)