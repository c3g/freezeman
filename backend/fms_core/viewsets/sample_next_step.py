from django.db.models import F, Q, When, Case, BooleanField
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.filters import SampleNextStepFilter


from ._utils import TemplateActionsMixin, TemplatePrefillsLabWorkMixin, _list_keys
from ._constants import _sample_next_step_filterset_fields
from fms_core.models import SampleNextStep, StepSpecification, Protocol, Step, Workflow
from fms_core.serializers import SampleNextStepSerializer, StepSpecificationSerializer
from fms_core.templates import (SAMPLE_EXTRACTION_TEMPLATE, SAMPLE_QC_TEMPLATE, NORMALIZATION_PLANNING_TEMPLATE, NORMALIZATION_TEMPLATE,
                                LIBRARY_PREPARATION_TEMPLATE, SAMPLE_TRANSFER_TEMPLATE, LIBRARY_QC_TEMPLATE, SAMPLE_POOLING_TEMPLATE, LIBRARY_CAPTURE_TEMPLATE,
                                LIBRARY_CONVERSION_TEMPLATE, EXPERIMENT_ILLUMINA_TEMPLATE, EXPERIMENT_MGI_TEMPLATE, EXPERIMENT_INFINIUM_TEMPLATE)
from fms_core.template_importer.importers import (ExtractionImporter, SampleQCImporter, NormalizationPlanningImporter, NormalizationImporter,
                                                  LibraryPreparationImporter, TransferImporter, LibraryQCImporter, SamplePoolingImporter, LibraryCaptureImporter,
                                                  LibraryConversionImporter, ExperimentRunImporter)

class SampleNextStepViewSet(viewsets.ModelViewSet, TemplateActionsMixin, TemplatePrefillsLabWorkMixin):
    queryset = SampleNextStep.objects.all().distinct()
    serializer_class = SampleNextStepSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_sample_next_step_filterset_fields
    }
    ordering_fields = {
        *_list_keys(_sample_next_step_filterset_fields)
    }

    filterset_class = SampleNextStepFilter

    queryset = queryset.annotate(
        qc_flag=Case(
            When(Q(sample__quality_flag=True) & Q(sample__quantity_flag=True), then=True),
            When(Q(sample__quality_flag=False) | Q(sample__quantity_flag=False), then=False),
            default=None,
            output_field=BooleanField()
        )
    )

    queryset = queryset.annotate(
        quantity_ng=F('sample__concentration')*F('sample__volume')
    )

    # Template actions will need to be filtered by the frontend on the basis of the template -> protocol which contains the protocol name.
    template_action_list = [
        {
            "name": "DNA or RNA Extractions",
            "description": "Upload the provided template with extraction information.",
            "template": [SAMPLE_EXTRACTION_TEMPLATE["identity"]],
            "importer": ExtractionImporter,
        },
        {
            "name": "Sample Quality Control",
            "description": "Upload the provided template with samples that underwent a quality control.",
            "template": [SAMPLE_QC_TEMPLATE["identity"]],
            "importer": SampleQCImporter,
        },
        {
            "name": "Perform Normalization Planning",
            "description": "Upload the provided template with normalization information to populate normalization template and the robot file.",
            "template": [NORMALIZATION_PLANNING_TEMPLATE["identity"]],
            "importer": NormalizationPlanningImporter,
        },
        {
            "name": "Normalize Samples or Libraries",
            "description": "Upload the provided template with information to normalize samples or libraries.",
            "template": [NORMALIZATION_TEMPLATE["identity"]],
            "importer": NormalizationImporter,
        },
        {
            "name": "Prepare Libraries",
            "description": "Upload the provided template with information to prepare libraries with the possibility to group them by batch.",
            "template": [LIBRARY_PREPARATION_TEMPLATE["identity"]],
            "importer": LibraryPreparationImporter,
        },
        {
            "name": "Transfer",
            "description": "Upload the provided template with libraries to be transfered.",
            "template": [SAMPLE_TRANSFER_TEMPLATE["identity"]],
            "importer": TransferImporter,
        },
        {
            "name": "Library Quality Control",
            "description": "Upload the provided template with libraries that underwent a quality control.",
            "template": [LIBRARY_QC_TEMPLATE["identity"]],
            "importer": LibraryQCImporter,
        },
        {
            "name": "Pool Samples or Libraries",
            "description": "Upload the provided template with information to pool samples or libraries.",
            "template": [SAMPLE_POOLING_TEMPLATE["identity"]],
            "importer": SamplePoolingImporter,
        },
        {
            "name": "Capture Libraries",
            "description": "Upload the provided template with libraries or pooled libraries to capture.",
            "template": [LIBRARY_CAPTURE_TEMPLATE["identity"]],
            "importer": LibraryCaptureImporter,
        },
        {
            "name": "Convert Libraries",
            "description": "Upload the provided template with libraries to convert.",
            "template": [LIBRARY_CONVERSION_TEMPLATE["identity"]],
            "importer": LibraryConversionImporter,
        },
        {
            "name": "Add Experiments",
            "description": "Upload the provided template with experiment run information.",
            "template": [EXPERIMENT_ILLUMINA_TEMPLATE['identity'], EXPERIMENT_MGI_TEMPLATE['identity'], EXPERIMENT_INFINIUM_TEMPLATE["identity"]],
            "importer": ExperimentRunImporter,
        },
    ]

    # Template prefills will need to be filtered by the frontend on the basis of the template -> identity -> protocol which contains the protocol name.
    template_prefill_list = [
        {"template": SAMPLE_EXTRACTION_TEMPLATE},
        {"template": SAMPLE_QC_TEMPLATE},
        {"template": NORMALIZATION_PLANNING_TEMPLATE},
        {"template": NORMALIZATION_TEMPLATE},
        {"template": LIBRARY_PREPARATION_TEMPLATE},
        {"template": SAMPLE_TRANSFER_TEMPLATE},
        {"template": LIBRARY_QC_TEMPLATE},
        {"template": SAMPLE_POOLING_TEMPLATE},
        {"template": LIBRARY_CAPTURE_TEMPLATE},
        {"template": LIBRARY_CONVERSION_TEMPLATE},
        {"template": EXPERIMENT_ILLUMINA_TEMPLATE},
        {"template": EXPERIMENT_MGI_TEMPLATE},
        {"template": EXPERIMENT_INFINIUM_TEMPLATE},
    ]

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
        for protocol in Protocol.objects.all():
            # Get the sample count waiting for this protocol
            protocol_sample_count = SampleNextStep.objects.filter(step__protocol=protocol).count()

            if protocol.id not in sample_next_step_by_protocol.keys():

                protocolSteps = Step.objects.filter(protocol=protocol)

                # Make sure that at least one workflow uses one of the steps for this protocol, since
                # labwork doesn't need protocols that are not used by any workflow (Infinium...)
                if not Workflow.objects.filter(steps__in=protocolSteps).exists():
                    continue
                
                # Some protocols have no associated steps, so don't include those in labwork info.
                if protocolSteps.count() > 0:
                    # Add protocol info to the results
                    sample_next_step_by_protocol['protocols'][protocol.id] = {
                        "name" : protocol.name, 
                        "count": protocol_sample_count,
                        "steps": []
                    }

                    # Iterate through the objects within the protocol
                    for step in protocolSteps:
                        # Get the precise count of sample for the specific step within the protocol and the specifications
                        step_sample_count = SampleNextStep.objects.filter(step=step).count()
                        step_specifications = StepSpecification.objects.filter(step=step)
                        step_specifications = StepSpecificationSerializer(step_specifications, many=True).data

                        # Add step information to the protocol
                        sample_next_step_by_protocol['protocols'][protocol.id]["steps"].append({
                            "id": step.id,
                            "name" : step.name, 
                            "count": step_sample_count,
                            "step_specifications": step_specifications
                        })

        return Response({"results": sample_next_step_by_protocol})
