import json
from django.db.models import F, Q, When, Case, BooleanField, CharField, IntegerField, Value
from django.http import HttpRequest, HttpResponseBadRequest, QueryDict
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.filters import SampleNextStepFilter

from collections import defaultdict


from ._utils import TemplateActionsMixin, TemplatePrefillsLabWorkMixin, AutomationsMixin, _list_keys
from ._constants import _sample_next_step_filterset_fields
from fms_core.models import SampleNextStep, StepSpecification, Protocol, Step, Workflow
from fms_core.serializers import SampleNextStepSerializer, StepSpecificationSerializer
from fms_core.templates import (EXPERIMENT_PACBIO_TEMPLATE, SAMPLE_EXTRACTION_TEMPLATE, SAMPLE_QC_TEMPLATE, NORMALIZATION_PLANNING_TEMPLATE, NORMALIZATION_TEMPLATE,
                                LIBRARY_PREPARATION_TEMPLATE, SAMPLE_TRANSFER_TEMPLATE, LIBRARY_QC_TEMPLATE, SAMPLE_POOLING_PLANNING_TEMPLATE, 
                                SAMPLE_POOLING_TEMPLATE, LIBRARY_CAPTURE_TEMPLATE, LIBRARY_CONVERSION_TEMPLATE, EXPERIMENT_ILLUMINA_TEMPLATE,
                                EXPERIMENT_MGI_TEMPLATE, EXPERIMENT_INFINIUM_TEMPLATE, AXIOM_PREPARATION_TEMPLATE,
                                QUALITY_CONTROL_INTEGRATION_SPARK_TEMPLATE, EXPERIMENT_AXIOM_TEMPLATE, SAMPLE_IDENTITY_QC_TEMPLATE)
from fms_core.template_importer.importers import (ExtractionImporter, SampleQCImporter, NormalizationPlanningImporter, NormalizationImporter,
                                                  LibraryPreparationImporter, TransferImporter, LibraryQCImporter, SamplePoolingImporter,
                                                  SamplePoolingPlanningImporter, LibraryCaptureImporter, LibraryConversionImporter,
                                                  ExperimentRunImporter, AxiomPreparationImporter, QCIntegrationSparkImporter, SampleIdentityQCImporter)

class SampleNextStepViewSet(viewsets.ModelViewSet, TemplateActionsMixin, TemplatePrefillsLabWorkMixin, AutomationsMixin):
    queryset = SampleNextStep.objects.all().distinct()

    queryset = queryset.annotate(
        qc_flag=Case(
            When(Q(sample__quality_flag=False) | Q(sample__quantity_flag=False), then=False),
            When(Q(sample__quality_flag=True) | Q(sample__quantity_flag=True), then=True),
            default=None,
            output_field=BooleanField()
        )
    )

    queryset = queryset.annotate(
        quantity_ng=F('sample__concentration')*F('sample__volume')
    )

    queryset = queryset.annotate(
        ordering_container_name=Case(
            When(Q(sample__coordinate__isnull=True) and Q(sample__container__location__isnull=False), then=F('sample__container__location__name')),
            When(Q(sample__coordinate__isnull=True), then=Value("tubes without parent container")),
            default=F('sample__container__name'),
            output_field=CharField()
        )
    )

    queryset = queryset.annotate(
        ordering_container_barcode=Case(
            When(Q(sample__coordinate__isnull=True) and Q(sample__container__location__isnull=False), then=F('sample__container__location__barcode')),
            When(Q(sample__coordinate__isnull=True), then=Value("tubes without parent container barcode")),
            default=F('sample__container__barcode'),
            output_field=CharField()
        )
    )

    queryset = queryset.annotate(
        ordering_container_coordinate_column=Case(
            When(Q(sample__coordinate__isnull=True), then=F('sample__container__coordinate__column')),
            default=F('sample__coordinate__column'),
            output_field=IntegerField()
        )
    )

    queryset = queryset.annotate(
        ordering_container_coordinate_row=Case(
            When(Q(sample__coordinate__isnull=True), then=F('sample__container__coordinate__row')),
            default=F('sample__coordinate__row'),
            output_field=IntegerField()
        )
    )

    queryset = queryset.annotate(
        ordering_container_coordinates=Case(
            When(Q(sample__coordinate__isnull=True), then=F('sample__container__coordinate__name')),
            default=F('sample__coordinate__name'),
            output_field=CharField()
        )
    )

    queryset = queryset.annotate(
        is_pooled=Case(
            When(Q(sample__derived_by_samples__volume_ratio__lt=1), then=True),
            default=False,
            output_field=BooleanField()
        )
    )
    
    queryset = queryset.annotate(
        project_name=Case(
            When(Q(is_pooled=True), then=Value("(Pooled)")),
            default=F("sample__derived_by_samples__project__name"),
            output_field=CharField()
        )
    )

    serializer_class = SampleNextStepSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_sample_next_step_filterset_fields
    }
    ordering_fields = {
        *_list_keys(_sample_next_step_filterset_fields),
        'ordering_container_name',
        'ordering_container_coordinate_column',
        'ordering_container_coordinate_row',
        "qc_flag"
    }

    ordering = ["id"]

    filterset_class = SampleNextStepFilter

    # Template actions will need to be filtered by the frontend on the basis of the template -> protocol which contains the protocol name.
    template_action_list = [
        {
            "name": "Prepare Axiom Samples",
            "description": "Upload the provided template with Axiom preparation information.",
            "template": [AXIOM_PREPARATION_TEMPLATE["identity"]],
            "importer": AxiomPreparationImporter,
        },
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
            "name": "Sample Identity Quality Control",
            "description": "Upload the provided template with samples that underwent an identity quality control.",
            "template": [SAMPLE_IDENTITY_QC_TEMPLATE["identity"]],
            "importer": SampleIdentityQCImporter,
        },
        {
            "name": "Quality Control - Integration",
            "description": "Upload the result file with samples that underwent a quality control.",
            "template": [QUALITY_CONTROL_INTEGRATION_SPARK_TEMPLATE["identity"]],
            "importer": QCIntegrationSparkImporter,
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
            "name": "Perform Pooling Planning",
            "description": "Upload the provided template with pooling information to populate pooling template and the robot file.",
            "template": [SAMPLE_POOLING_PLANNING_TEMPLATE["identity"]],
            "importer": SamplePoolingPlanningImporter,
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
            "template": [EXPERIMENT_ILLUMINA_TEMPLATE['identity'], EXPERIMENT_MGI_TEMPLATE['identity'], EXPERIMENT_INFINIUM_TEMPLATE["identity"], EXPERIMENT_AXIOM_TEMPLATE["identity"], EXPERIMENT_PACBIO_TEMPLATE["identity"]],
            "importer": ExperimentRunImporter,
        },
    ]

    # Template prefills will need to be filtered by the frontend on the basis of the template -> identity -> protocol which contains the protocol name.
    template_prefill_list = [
        {"template": AXIOM_PREPARATION_TEMPLATE},
        {"template": SAMPLE_EXTRACTION_TEMPLATE},
        {"template": SAMPLE_QC_TEMPLATE},
        {"template": SAMPLE_IDENTITY_QC_TEMPLATE},
        {"template": NORMALIZATION_PLANNING_TEMPLATE},
        {"template": NORMALIZATION_TEMPLATE},
        {"template": LIBRARY_PREPARATION_TEMPLATE},
        {"template": SAMPLE_TRANSFER_TEMPLATE},
        {"template": LIBRARY_QC_TEMPLATE},
        {"template": SAMPLE_POOLING_PLANNING_TEMPLATE},
        {"template": SAMPLE_POOLING_TEMPLATE},
        {"template": LIBRARY_CAPTURE_TEMPLATE},
        {"template": LIBRARY_CONVERSION_TEMPLATE},
        {"template": EXPERIMENT_ILLUMINA_TEMPLATE},
        {"template": EXPERIMENT_MGI_TEMPLATE},
        {"template": EXPERIMENT_INFINIUM_TEMPLATE},
        {"template": EXPERIMENT_AXIOM_TEMPLATE},
        {"template": EXPERIMENT_PACBIO_TEMPLATE},
    ]

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.request.method == 'POST':
            sample__id__in = None
            content_type = self.request.META.get('CONTENT_TYPE', '')
            if content_type == 'application/json':
                jsonQueryParams = json.loads(self.request.body.decode())
                if 'sample__id__in' in jsonQueryParams:
                    sample__id__in = jsonQueryParams['sample__id__in']
            elif content_type.startswith('multipart/form-data'):
                if self.request.POST.get("sample__id__in"):
                    sample__id__in = self.request.POST["sample__id__in"]
                    sample__id__in = [int(s.strip()) for s in sample__id__in.split(",")]

            if sample__id__in:
                queryset = queryset.filter(sample__id__in=sample__id__in)

        params = QueryDict(self.request.META.get('QUERY_STRING'))
        project_name = params.get('project_name')
        if project_name:
            queryset = queryset.filter(project_name=project_name)
            
        return queryset

    @action(detail=False, methods=['post'])
    def list_post(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

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
                },
                automations:
                {
                    count
                    steps: [{
                        name
                        count
                        step_specifications
                    }]    
                }
            }
          }
        """
        self.queryset = self.filter_queryset(self.get_queryset())
        # The objects that is going to be returned
        sample_next_step_summary = {"protocols":{}, "automations": {"count": 0, "steps": []}}
        
        # Iterate through protocols
        for protocol in Protocol.objects.all():
            # Get the sample count waiting for this protocol
            protocol_sample_count = SampleNextStep.objects.filter(step__protocol=protocol).count()

            protocolSteps = Step.objects.filter(protocol=protocol)

            # Make sure that at least one workflow uses one of the steps for this protocol, since
            # labwork doesn't need protocols that are not used by any workflow (Infinium...)
            if not Workflow.objects.filter(steps__in=protocolSteps).exists():
                continue
            
            # Some protocols have no associated steps, so don't include those in labwork info.
            if protocolSteps.count() > 0:
                # Add protocol info to the results
                sample_next_step_summary['protocols'][protocol.id] = {
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
                    sample_next_step_summary['protocols'][protocol.id]["steps"].append({
                        "id": step.id,
                        "name" : step.name, 
                        "count": step_sample_count,
                        "step_specifications": step_specifications
                    })
        # Iterate through automation steps
        automationlSteps = Step.objects.filter(protocol__isnull=True)
        automation_sample_count = 0
        for step in automationlSteps:
            # Make sure that at least one workflow uses this automation step, since
            # labwork doesn't need steps that are not used by any workflow
            if not Workflow.objects.filter(steps__in=[step]).exists():
                continue
            
            # Get the precise count of sample for the specific step and the specifications
            step_sample_count = SampleNextStep.objects.filter(step=step).count()
            automation_sample_count = automation_sample_count + step_sample_count
            step_specifications = StepSpecification.objects.filter(step=step)
            step_specifications = StepSpecificationSerializer(step_specifications, many=True).data

            # Add step information to the protocol
            sample_next_step_summary["automations"]["steps"].append({
                "id": step.id,
                "name" : step.name, 
                "count": step_sample_count,
                "step_specifications": step_specifications,
            })
        sample_next_step_summary["automations"]["count"] = automation_sample_count

        return Response({"results": sample_next_step_summary})

    @action(detail=False, methods=["post"])
    def labwork_step_info(self, request: HttpRequest, *args, **kwargs):
        """
        API call to retrieve the lab work information for a step about the number samples waiting for a grouping column provided.

        Args:
            `request`: The request object received then whe API call was made.
                       The request must include the query arguments 'step__id__in' and 'group_by'.
                       Valid 'group_by' include : - sample__derived_by_samples__project__name
                                                  - ordering_container_name
                                                  - sample__creation_date
                                                  - sample__created_by__username
                                                  - qc_flag
            `*args`: Arguments to set on the view.
            `**kwargs`: Additional properties to set on the view.
                    
        Returns:
          An object of the form:
          {
            results:
            {
              step_id: id
              samples: 
              {
                grouping_column : column_name
                groups : [
                  {
                    name = grouping_value_1
                    count
                    sample_locators: []
                  },
                  {
                    name = grouping_value_2
                    count
                    sample_locators: []
                  },
                  ...
                ],                
              }
            }
          }
        """
        params = QueryDict(request.META.get('QUERY_STRING'))
        step_id = params.get('step__id__in')
        grouping_column = params.get('group_by')

        if step_id is None or grouping_column is None:
            return HttpResponseBadRequest(f"Step ID and a grouping column must be provided.")
        # The objects that is going to be returned
        grouped_step_summary = {"step_id": step_id, "samples": {"grouping_column": grouping_column, "groups": []}}

        grouped_step_samples = self.filter_queryset(self.get_queryset())
        # Get all samples on the steps with the grouping field
        grouped_step_samples = grouped_step_samples.filter(step__id__exact=step_id) \
            .annotate(sample_name=F("sample__name")) \
            .annotate(container_name=F("sample__container__name")) \
            .values_list(
                "sample_id",
                "sample_name",
                "container_name",
                "project_name",
                grouping_column,
                "ordering_container_barcode",
                "ordering_container_coordinates"
            )

        groups = defaultdict(list)
        # Extract the locators from the entries
        for sample_id, sample_name, container_name, project_name, group_column, container_barcode, container_coordinates in grouped_step_samples.all():
            groups[group_column].append({
                "sample_id": sample_id,
                "sample_name": sample_name,
                "container_name": container_name,
                "project_name": project_name,
                "contextual_container_barcode": container_barcode,
                "contextual_coordinates": container_coordinates
            })
        # Build the summary using locators
        for grouping in sorted(groups.keys()):
            grouped_step_summary["samples"]["groups"].append({
                "name": grouping,
                "count": len(groups[grouping]),
                "sample_locators": groups[grouping]
            })

        return Response({"results": grouped_step_summary})
