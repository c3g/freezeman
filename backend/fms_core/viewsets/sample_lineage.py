from tkinter import W
from fms_core.services.sample_lineage import create_sample_lineage_graph
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError

from fms_core.models import Sample
from fms_core.serializers import SampleSerializer, ProcessMeasurementSerializer

class SampleLineageViewSet(viewsets.ViewSet):
    @action(detail=True, methods=["get"])
    def graph(self, _request, pk):
        parent_sample = Sample.objects.get(pk=pk)
        nodes, edges, errors = create_sample_lineage_graph(parent_sample)

        if errors:
            raise ValidationError(errors)
        else:
            return Response({
                "nodes": nodes,
                "edges": edges,
            })
