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

def get_sample_source_from_derived_sample(child_sample_id: int, child_derived_sample_id: int) -> List[int]:
    """
    Provides the sample id of the last aliquot of a sample that completed an experiment run before pooling 
    using the derived sample and experiment sample id to trace it back.

    Args:
        `child_sample_id`: ID of the child sample of the lineage
        `child_derived_sample_id`: ID of the child derived sample to disambiguate pools.

    Returns:
        Tuple with the sample source id, errors and warnings.
    """
    candidate_sample_id = None
    errors = []
    warnings = []

    if child_sample_id is None:
        errors.append(f"Experiment sample is required.")
    if child_derived_sample_id is None:
        errors.append(f"Experiment sample derived sample is required.")

    if not errors:
        child_sample_param = tuple([child_sample_id])
        child_derived_sample_param = tuple([child_derived_sample_id])

        """
        This query does a recursive search on the sample_lineage table.
        
        It starts from an input of sample id with a paired derived_sample id (to uniquely identify a sample in a pool).
       
        The query lists all lineages (id, child_id and parent_id) encountered moving up the lineage (toward parent samples)
        that matches the given derived_sample_id.

        Returns a queryset with distinct fields id, child_id, parent_id. 
        """
        samples = SampleLineage.objects.raw('''WITH RECURSIVE parent(id, child_id, parent_id, derived_sample_id) AS (
                                            select DISTINCT fcsl1.id, fcsl1.child_id, fcsl1.parent_id, fcd1.derived_sample_id
                                            FROM fms_core_samplelineage fcsl1
                                            join fms_core_sample fcs1 on fcsl1.parent_id = fcs1.id
                                            join fms_core_derivedbysample fcd1 on fcs1.id = fcd1.sample_id
                                            WHERE fcsl1.child_id IN %s
                                            and fcd1.derived_sample_id IN %s
                                            UNION ALL
                                            SELECT child.id, child.child_id, child.parent_id, child.derived_sample_id
                                            FROM (
                                            select fcsl2.id, fcsl2.child_id, fcsl2.parent_id, fcd2.derived_sample_id
                                            from fms_core_samplelineage fcsl2
                                            join fms_core_sample fcs2 on fcsl2.parent_id = fcs2.id
                                            join fms_core_derivedbysample fcd2 on fcs2.id = fcd2.sample_id
                                            ) child, parent
                                            WHERE child.child_id = parent.parent_id
                                            and child.derived_sample_id = parent.derived_sample_id
                                            )
                                            SELECT distinct id, child_id, parent_id FROM parent''', params=[child_sample_param, child_derived_sample_param])

        sample_ids = tuple(sample.parent_id for sample in samples)
        sample_extract = Sample.objects.filter(id__in=sample_ids).order_by("-id")

        for sample in sample_extract:
            candidate_sample_id = sample.id
            if not sample.is_pool:
                break
            
    return (candidate_sample_id, errors, warnings)