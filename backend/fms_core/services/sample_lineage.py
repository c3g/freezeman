from django.db.models import F
from django.core.exceptions import ValidationError
from fms_core.models import SampleLineage, Sample, DerivedBySample, ProcessMeasurement


def create_sample_lineage(parent_sample, child_sample, process_measurement):
    sample_lineage = None
    errors = []
    warnings = []

     # Validate parameters
    if not parent_sample:
        errors.append(f"Parent sample is required for sample lineage creation.")
    if not child_sample:
        errors.append(f"Child sample is required for sample lineage creation.")
    if not process_measurement:
        errors.append(f"Process measurement is required for sample lineage creation.")

    if not errors:
        try:
            sample_lineage = SampleLineage.objects.create(child=child_sample,
                                                          parent=parent_sample,
                                                          process_measurement=process_measurement
                                                          )
        except ValidationError as e:
            errors.append(str(e))

    return (sample_lineage, errors, warnings)

def create_sample_lineage_graph(sampleId):
    errors = []
    nodes = []
    edges = []

    if not Sample.objects.filter(pk=sampleId).exists():
        errors.append(f"Sample with id ${sampleId} does not exist")

    if not errors:
        biosampleIds = DerivedBySample.objects.filter(sample__id=sampleId) \
                                              .values_list("derived_sample__biosample_id", flat=True)

        derivedBySamples = DerivedBySample.objects.filter(derived_sample__biosample__id__in=biosampleIds) \
                                                  .annotate(name=F("sample__name")) \
                                                  .annotate(quality_flag=F("sample__quality_flag")) \
                                                  .annotate(quantity_flag=F("sample__quantity_flag")) \

        sampleIds = derivedBySamples.values_list("sample__id", flat=True)
        process_measurements = ProcessMeasurement.objects.filter(source_sample__in=sampleIds) \
                                                         .select_related("process__lineage").annotate(child_sample=F("lineage__child")) \
                                                         .select_related("process_protocol").annotate(protocol_name=F("process__protocol__name"))

        nodes = list(derivedBySamples.values("name", "quality_flag", "quantity_flag").annotate(id=F("sample_id")))
        edges = list(process_measurements.values("id", "source_sample", "child_sample", "protocol_name"))
    
    return (nodes, edges, errors)