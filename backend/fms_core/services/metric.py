from typing import Dict, List, Tuple

from fms_core.models.metric import Metric
from fms_core.models.readset import Readset

VALUE_TYPE_NUMERIC = "NUMERIC"
VALUE_TYPE_STRING = "STRING"

METRICS = {
    "index": [("pct_on_index_in_lane", VALUE_TYPE_NUMERIC),
              ("pct_of_the_lane", VALUE_TYPE_NUMERIC),
              ("pct_perfect_barcode", VALUE_TYPE_NUMERIC),
              ("pct_one_mismatch_barcode", VALUE_TYPE_NUMERIC),
              ("pf_clusters", VALUE_TYPE_NUMERIC),
              ("yield", VALUE_TYPE_NUMERIC),
              ("mean_quality_score", VALUE_TYPE_NUMERIC),
              ("pct_q30_bases", VALUE_TYPE_NUMERIC)],
    "qc": [("avg_qual", VALUE_TYPE_NUMERIC),
            ("duplicate_rate", VALUE_TYPE_NUMERIC),
            ("nb_reads", VALUE_TYPE_NUMERIC),
            ("nb_bases", VALUE_TYPE_NUMERIC)],
    "blast": [("1st_hit", VALUE_TYPE_STRING),
              ("2nd_hit", VALUE_TYPE_STRING),
              ("3rd_hit", VALUE_TYPE_STRING)],
    "alignment": [("chimeras", VALUE_TYPE_NUMERIC),
                  ("average_aligned_insert_size", VALUE_TYPE_NUMERIC),
                  ("reported_sex", VALUE_TYPE_STRING),
                  ("inferred_sex", VALUE_TYPE_STRING),
                  ("sex_concordance", VALUE_TYPE_NUMERIC),
                  ("pf_read_alignment_rate", VALUE_TYPE_NUMERIC),
                  ("freemix", VALUE_TYPE_NUMERIC),
                  ("adapter_dimers", VALUE_TYPE_NUMERIC),
                  ("mean_coverage", VALUE_TYPE_NUMERIC),
                  ("aligned_dup_rate", VALUE_TYPE_NUMERIC)]
}

def create_metrics_from_run_validation_data(readset: Readset, run_validation_data: Dict) -> Tuple[List[Metric], List[str], List[str]]:
    """
    Create the metrics for the readset using the run_validation_data received as parameter (taken from run_processing JSON).

    Args:
        `readset`: Readset mathing the metrics.
        `run_validation_data`: JSON data object from which the metrics are extracted (run_validation_data[metric_group][metric]).
    
    Returns:
        Tuple with a list of metric object created ([] if none were created and None if there was an error), errors and warnings
    """
    metrics_obj = []
    errors = []
    warnings = []

    if not isinstance(readset, Readset):
        errors.append(f"Missing valid readset. Cannot create metrics.")

    if not errors:
        for metric_group, metrics in METRICS.items():
            for metric, value_type in metrics:
                try:
                    value = run_validation_data[metric_group][metric]
                except Exception as err:
                    errors.append(f"Could not find metrics {metric} from metric group {metric_group} for sample {readset.sample_name}.")
                if not errors:
                    if value == "null" or value == "N/A":  # Replace string empty values
                        value = None
                    if value_type is VALUE_TYPE_NUMERIC and value is not None:
                        value = str(value).strip(' "')
                    metric_data = dict(
                        readset=readset,
                        name=metric,
                        metric_group=metric_group,
                        **(dict(value_numeric=value) if value_type is VALUE_TYPE_NUMERIC else dict()),
                        **(dict(value_string=value) if value_type is VALUE_TYPE_STRING else dict()),
                    )
                    metric_obj = None
                    try:
                        metric_obj = Metric.objects.create(**metric_data)
                        metrics_obj.append(metric_obj)
                    except Exception as err:
                        errors.append(err)

    if errors:
        metrics_obj = None
    
    return metrics_obj, errors, warnings