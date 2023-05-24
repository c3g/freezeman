from typing import Any, Dict, List, Tuple, Optional
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

def create_sample_lineage_graph(sampleId: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    """
    Generates a sample lineage of all samples that share the
    same biosample ID of the `sampleId`. Returns a graph that
    is acyclical and consists of `nodes` and `edges`.

    Args:
        `sampleId`: ID of an existing sample

    Returns:
        `Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]` consisting of `nodes`, `edges` and `errors`.
        Each node consists of sample `"name"`, `"quality_flag"` and `"quantity_flag"`.
        Each edge consists of process `"id"`, `"source_sample"`, `"child_sample"`, `"protocol_name"`.
        `errors` contains an error if the ID in `sampleId` does not correspond
        to an existing sample.

    """

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
                                                         .annotate(child_sample=F("lineage__child")) \
                                                         .annotate(protocol_name=F("process__protocol__name"))

        nodes = list(derivedBySamples.values("name", "quality_flag", "quantity_flag").annotate(id=F("sample_id")))
        edges = list(process_measurements.values("id", "source_sample", "child_sample", "protocol_name"))
    
    return (nodes, edges, errors)

def get_library_size_for_derived_sample(derived_sample_id: int) -> Optional[int]:
    """
    Provides the latest measured fragment_size related to a derived_sample

    Args:
        `derived_sample_id`: Derived_sample for which we want the latest measured fragment_size

    Returns:
        An integer that represents the fragment_size (library_size), None if not found or never measured.
    """
    samples_with_library_size = DerivedBySample.objects.filter(derived_sample_id=derived_sample_id, sample__fragment_size__isnull=False)
     # Most recent sample in the lineage chain will have a larger id
    ordered_samples_with_library_size = samples_with_library_size.order_by("-sample__parent_sample__id")
    library_size = ordered_samples_with_library_size.values_list("sample__fragment_size", flat=True).first()
    return library_size