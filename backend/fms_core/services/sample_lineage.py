from typing import Any, Dict, List, Tuple, Optional
from django.db.models import F
from django.core.exceptions import ValidationError
from fms_core.models import SampleLineage, Sample, DerivedBySample, ProcessMeasurement
from datetime import date

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
        Each node consists of sample `"name"`, `"quality_flag"`, `"quantity_flag"`, and `"identity_flag"`.
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
                                                  .annotate(identity_flag=F("sample__identity_flag")) \

        sampleIds = derivedBySamples.values_list("sample__id", flat=True)
        process_measurements = ProcessMeasurement.objects.filter(source_sample__in=sampleIds) \
                                                         .annotate(child_sample=F("lineage__child")) \
                                                         .annotate(protocol_name=F("process__protocol__name"))

        nodes = list(derivedBySamples.values("name", "quality_flag", "quantity_flag", "identity_flag").annotate(id=F("sample_id")))
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



def get_first_extraction_date(root_sample_id: int) -> Optional[date]:
    """Return the earliest extraction date among the root sample's descendants."""
    sample_ids_to_visit = {root_sample_id}
    visited_sample_ids = set()
    first_extraction_date = None

    while sample_ids_to_visit:
        visited_sample_ids.update(sample_ids_to_visit)

        lineages = (
            SampleLineage.objects
            .filter(parent_id__in=sample_ids_to_visit)
            .values_list(
                "child_id",
                "process_measurement__process__protocol__name",
                "process_measurement__execution_date",
            )
        )

        next_sample_ids = set()

        for child_id, protocol_name, execution_date in lineages:
            if protocol_name == "Extraction":
                if (
                    first_extraction_date is None
                    or execution_date < first_extraction_date
                ):
                    first_extraction_date = execution_date

            if protocol_name not in ("Extraction", "Sample Pooling"):
                next_sample_ids.add(child_id)

        sample_ids_to_visit = next_sample_ids - visited_sample_ids

    return first_extraction_date


def get_first_extraction_dates(
    root_sample_ids: List[int],
) -> Dict[int, Optional[date]]:
    """Return the earliest extraction date for each root sample."""
    extraction_dates = {
        root_id: None
        for root_id in root_sample_ids
    }

    roots_by_sample = {
        root_id: {root_id}
        for root_id in root_sample_ids
    }

    visited_pairs = {
        (root_id, root_id)
        for root_id in root_sample_ids
    }

    while roots_by_sample:
        lineages = (
            SampleLineage.objects
            .filter(parent_id__in=roots_by_sample)
            .values_list(
                "parent_id",
                "child_id",
                "process_measurement__process__protocol__name",
                "process_measurement__execution_date",
            )
        )
        next_roots_by_sample = {}

        for parent_id, child_id, protocol_name, execution_date in lineages:
            if protocol_name == "Extraction":
                for root_id in roots_by_sample[parent_id]:
                    current_date = extraction_dates[root_id]

                    if current_date is None or execution_date < current_date:
                        extraction_dates[root_id] = execution_date
            if protocol_name not in ("Extraction", "Sample Pooling"):
                for root_id in roots_by_sample[parent_id]:
                    pair = (child_id, root_id)

                    if pair in visited_pairs:
                        continue

                    visited_pairs.add(pair)

                    if child_id not in next_roots_by_sample:
                        next_roots_by_sample[child_id] = set()

                    next_roots_by_sample[child_id].add(root_id)

        roots_by_sample = next_roots_by_sample

    return extraction_dates