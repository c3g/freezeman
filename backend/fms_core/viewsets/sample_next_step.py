from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.models import SampleNextStep, StepSpecification
from fms_core.serializers import SampleNextStepSerializer, StepSpecificationSerializer
from django.core.exceptions import ValidationError

from collections import defaultdict

class SampleNextStepViewSet(viewsets.ModelViewSet):
    queryset = SampleNextStep.objects.all()
    serializer_class = SampleNextStepSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def labwork_info(self, request, *args, **kwargs):
        self.queryset = self.filter_queryset(self.get_queryset())
        sample_next_step_by_protocol = dict(protocols=dict())
        for sample_next_step in self.queryset:
            # hasn't finished workflow 
            if sample_next_step.step_order:
                step_obj = sample_next_step.step_order.step
                step_specs = StepSpecification.objects.filter(step=step_obj)
                step_specs = StepSpecificationSerializer(step_specs, many=True).data

                if step_obj.protocol.id in sample_next_step_by_protocol["protocols"]:
                    sample_next_step_by_protocol["protocols"][step_obj.protocol.id]["count"] += 1
                    step = next((step for step in sample_next_step_by_protocol["protocols"][step_obj.protocol.id]["steps"] if step_obj.name in step.keys()), None)
                    if step:
                        step[step_obj.name]["count"] += 1
                    else:
                        sample_next_step_by_protocol["protocols"][step_obj.protocol.id]["steps"].append(
                            {
                                step_obj.name: {
                                    "count": 1,
                                    "step_specification": step_specs
                                }
                            }
                        )
                                       
                else: 
                    sample_next_step_by_protocol["protocols"][step_obj.protocol.id] = {
                        "protocol_name": step_obj.protocol.name,
                        "count": 1,
                        "steps":[
                            {
                                step_obj.name: {
                                    "count": 1,
                                    "step_specification":step_specs
                                }
                            }
                        ]
                    }

        return Response({"results": sample_next_step_by_protocol})