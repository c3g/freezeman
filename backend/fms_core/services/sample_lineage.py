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
        derivedBySample = DerivedBySample.objects.filter(sample__id=sampleId) \
                                                 .values_list("derived_sample__biosample_id", flat=True)

        sampleIds = DerivedBySample.objects.filter(derived_sample__biosample__id__in=derivedBySample) \
                                           .values_list("sample__id", flat=True)
        samples = Sample.objects.filter(id__in=sampleIds)

        process_measurements = ProcessMeasurement.objects.filter(source_sample__in=sampleIds) \
                                                         .select_related("process__lineage").annotate(child_sample=F("lineage__child")) \
                                                         .select_related("process_protocol").annotate(protocol_name=F("process__protocol__name"))

        nodes = list(samples.values("id", "name", "quality_flag", "quantity_flag"))
        edges = list(process_measurements.values("id", "source_sample", "child_sample", "protocol_name"))
    
    return (nodes, edges, errors)