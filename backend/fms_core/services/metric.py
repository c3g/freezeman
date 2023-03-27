from typing import Any, Dict, List, Optional, Tuple, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.metric import Metric
from fms_core.models.experiment_run import ExperimentRun
from fms_core.models.sample_run_metric import SampleRunMetric

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

def create_sample_run_metrics(dataset_file, run_validation_data, experiment_run = None):
    """
    Create the sample run metric for the dataset_file and experiment_run as well as the metrics found in the run_validation_data.
    The run_validation_data received is the same for all dataset_file of a single derived_sample.

    Args:
        `dataset_file`: One of the dataset file related to these metrics.
        `run_validation_data`: The json data object from which the metrics are extracted.
        `experiment_run`: Experiment run object. Defaults to None if the run was not launched from Freezeman.
    
    Returns:
        Tuple with the sample_run_metrics object list created ([] if none were created and None if there was an error), errors and warnings
    """
    sample_run_metrics = []
    errors = []
    warnings = []

    if not isinstance(dataset_file, DatasetFile):
        errors.append(f"Missing dataset_file. Cannot create sample run metrics.")
    if not errors:
        for metric_group, metrics in METRICS.items():
            for metric, value_type in metrics:
                try:
                    value = run_validation_data[metric_group][metric]
                except Exception as err:
                    errors.append(f"Could not find metrics {metric} from metric group {metric_group} for sample {dataset_file.sample_name}.")
                if not errors:
                    if value == "null" or value == "N/A":  # Replace string empty values
                        value = None

                    metric_data = dict(
                        name=metric,
                        metric_group=metric_group,
                        **(dict(value_numeric=value) if value_type is VALUE_TYPE_NUMERIC else dict()),
                        **(dict(value_string=value) if value_type is VALUE_TYPE_STRING else dict()),
                    )

                    try:
                        metric_obj = Metric.objects.create(**metric_data)
                    except Exception as err:
                        errors.append(err)

                    try:
                        sample_run_metric = SampleRunMetric.objects.create(dataset_file=dataset_file,
                                                                           experiment_run=experiment_run,
                                                                           metric=metric_obj)
                    except Exception as err:
                        errors.append(err)
            
                    sample_run_metrics.append(sample_run_metric)

    if errors:
        sample_run_metrics = None
    
    return sample_run_metrics, errors, warnings