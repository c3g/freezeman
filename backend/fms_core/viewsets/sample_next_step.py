from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.models import SampleNextStep, StepSpecification, Protocol, Step
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
                    protocol_id: {
                        name
                        count
                        steps: [{
                            name 
                            count
                            step_specifications
                        }]
                    }
                }
            }
          }
        """
        self.queryset = self.filter_queryset(self.get_queryset())
        # The objects that is going to be returned
        sample_next_step_by_protocol = dict(protocols={})
        
        # Iterate through protocols
        for protocol in Protocol.objects.filter(steps__steps_order__sample_next_step__isnull=False):
            # Get the sample count waiting for this protocol
            protocol_sample_count = SampleNextStep.objects.filter(step_order__step__protocol=protocol).count()

            if protocol.id not in sample_next_step_by_protocol.keys():
                # Add protocol info to the results
                sample_next_step_by_protocol['protocols'][protocol.id] = {
                    "name" : protocol.name, 
                    "count": protocol_sample_count,
                    "steps": []
                }

                # Iterate through the objects within the protocol
                for step in Step.objects.filter(protocol=protocol):
                    # Get the precise count of sample for the specific step within the protocol and the specifications
                    step_sample_count = SampleNextStep.objects.filter(step_order__step=step).count()
                    step_specifications = StepSpecification.objects.filter(step=step)
                    step_specifications = StepSpecificationSerializer(step_specifications, many=True).data

                    # Add step information to the protocol
                    sample_next_step_by_protocol['protocols'][protocol.id]["steps"].append({
                        "name" : step.name, 
                        "count": step_sample_count,
                        "step_specifications": step_specifications
                    })

        return Response({"results": sample_next_step_by_protocol})