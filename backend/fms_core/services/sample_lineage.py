from django.db.models import F, Q, Count
from django.core.exceptions import ValidationError, ObjectDoesNotExist
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

def create_sample_lineage_graph(mid_sample):
    errors = []
    nodes = []
    edges = []

    if not mid_sample:
        errors.append(f"Sample is required for sample lineage graph creation")

    if not errors:
        derivedBySample = (
            DerivedBySample.objects
                .filter(sample__id=mid_sample.id)
                .select_related("derived_sample__biosample")
                .annotate(biosample_id=F("derived_sample__biosample_id"))
                .values_list("biosample_id", flat=True)
        )

        sampleIds = DerivedBySample.objects.filter(derived_sample__biosample__id__in=derivedBySample).values_list("sample__id", flat=True)
        samples = Sample.objects.filter(id__in=sampleIds)

        process_measurements = (
            ProcessMeasurement
                .objects
                .filter(source_sample__in=sampleIds)
                .select_related("process__lineage")
                .annotate(child_sample=F("lineage__child"))
        )

        nodes = list(samples.values(
            'id',
            'name',
            'quality_flag',
            'quantity_flag',
        ))

        edges = list(process_measurements.values(
            'id',
            'source_sample',
            'child_sample',
            'process__protocol__name',
        ))
    
    return (nodes, edges, errors)