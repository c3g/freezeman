from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.models import SampleNextStep, StepSpecification
from fms_core.serializers import SampleNextStepSerializer, StepSpecificationSerializer
from ._constants import _sample_next_step_filterset_fields

class SampleNextStepViewSet(viewsets.ModelViewSet):
    queryset = SampleNextStep.objects.all()
    serializer_class = SampleNextStepSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_sample_next_step_filterset_fields
    }

    @action(detail=False, methods=["get"])
    def labwork_info(self, request, *args, **kwargs):
        """
        API call to retrieve the lab work information about the number samples waiting for each step of a workflow. 
        As well as their step specifications.

        Args:
            `request`: The request object received then whe API call was made.
            `*args`: Arguments to set on the view.
            `**kwargs`: Additional properties to set on the view.
                    
        Returns:
          An object of the form:
          {
            results:
                {
                    protocols:
                        {
                            name
                            count
                            steps: {
                                name 
                                count
                                step_specifications
                            }
                           

                        }
                }
          }

        """
        self.queryset = self.filter_queryset(self.get_queryset())
        # The objects that is going to be returns
        sample_next_step_by_protocol = dict(protocols=dict())
        
        # Iterate through the SampleNextStep queryset
        for sample_next_step in self.queryset:
            # If the sample is still in the workflow (hasn't finished)
            if sample_next_step.step_order:
                # Get the step object to get the specifications
                step_obj = sample_next_step.step_order.step
                step_specs = StepSpecification.objects.filter(step=step_obj)
                step_specs = StepSpecificationSerializer(step_specs, many=True).data

                # The protocol of the step is already in the dictionary
                if step_obj.protocol.id in sample_next_step_by_protocol["protocols"]:
                    sample_next_step_by_protocol["protocols"][step_obj.protocol.id]["count"] += 1
                    # Look for the specific step within the protocol
                    step = next((step for step in sample_next_step_by_protocol["protocols"][step_obj.protocol.id]["steps"] if step["name"] == step_obj.name), None)
                    # If the step is found add to the count
                    if step:
                        step["count"] += 1
                    # Else add the step along with its information
                    else:
                        sample_next_step_by_protocol["protocols"][step_obj.protocol.id]["steps"].append(
                            {
                                "name": step_obj.name,
                                "count": 1,
                                "step_specifications":step_specs
                            }
                        )
                # If it is not then add the protocol along with its information                            
                else: 
                    sample_next_step_by_protocol["protocols"][step_obj.protocol.id] = {
                        "protocol_name": step_obj.protocol.name,
                        "count": 1,
                        "steps":[
                            {
                                "name": step_obj.name,
                                "count": 1,
                                "step_specifications":step_specs
                            }
                        ]
                    }

        return Response({"results": sample_next_step_by_protocol})