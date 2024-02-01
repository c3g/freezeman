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

def get_upward_lineage_samples(child_sample_id: int, child_derived_sample_id: int=None) -> List[int]:
    """
    Lists the parents samples ids from a sample lineage. The derived sample id is required for pools.

    Args:
        `child_sample_id`: ID of the child sample of the lineage
        `child_derived_sample_id`: ID of the child derived sample to disambiguate pools. Default to None for non pools.

    Returns:
        List of all samples ids in the upward lineage of the sample.
    """

    SampleLineage.objects.raw("""WITH RECURSIVE parent(child_id, parent_id, derived_sample_id) AS (
                                 select DISTINCT fcsl1.child_id, fcsl1.parent_id, fcd1.derived_sample_id
                                 FROM fms_core_samplelineage fcsl1
                                 join fms_core_sample fcs1 on fcsl1.parent_id = fcs1.id
                                 join fms_core_derivedbysample fcd1 on fcs1.id = fcd1.sample_id
                                 WHERE fcsl1.child_id IN %s
                                 and fcd1.derived_sample_id IN %s
                                 UNION ALL
                                 SELECT child.child_id, child.parent_id, child.derived_sample_id
                                 FROM (
                                 select fcsl2.child_id, fcsl2.parent_id, fcd2.derived_sample_id
                                 from fms_core_samplelineage fcsl2
                                 join fms_core_sample fcs2 on fcsl2.child_id = fcs2.id
                                 join fms_core_derivedbysample fcd2 on fcs2.id = fcd2.sample_id
                                 ) child, parent
                                 WHERE child.child_id = parent.parent_id
                                 and child.derived_sample_id = parent.derived_sample_id
                                 )
                                 SELECT distinct * FROM parent;""", params=[child_sample_id, child_derived_sample_id])