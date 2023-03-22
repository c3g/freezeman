from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.models import Q

from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset
from fms_core.models._constants import ReleaseStatus
from fms_core.schema_validators import RUN_PROCESSING_VALIDATOR

def create_dataset(external_project_id: str, run_name: str, lane: int, replace: bool = False) -> Tuple[Union[Dataset, None], List[str], List[str]]:
    """
    Create a new dataset and return it. If an dataset exists already with the same natural key (external_project_id, run_name and lane),
    two options exist.
    Option replace (replace=True): the existing dataset is returned, but the connected datasetfiles are deleted (in order to recreate them). 
    Option ignore (replace=False): the existing dataset is returned.

    Args:
        `external_project_id`: The project id from the external system that generate projects.
        `run_name`: The name or id of the experiment run.
        `lane`: The lane (coordinate) on the experiment container.
        `replace`: option to replace the files when a dataset is resubmitted (choices : False (default), True).

    Returns:
        Tuple containing the created Dataset, the error messages and the warning messages. 
    """
    dataset = None
    errors = []
    warnings = []

    if not (lane >= 0 and lane == int(lane)):
        errors.append("Lane must be a positive integer field")
        return (dataset, errors, warnings)

    try:
        kwargs = dict(
            external_project_id=external_project_id,
            run_name=run_name,
            lane=lane,
        )

        dataset_list = Dataset.objects.filter(**kwargs)
        if not dataset_list:  # There is no dataset with this signature
            dataset = Dataset.objects.create(**kwargs)
        elif replace:  # There is already a dataset with this signature but we replace it's content.
            dataset = dataset_list.first()
            for dataset_file in DatasetFile.objects.filter(dataset=dataset):
                dataset_file.delete()
        else:  # There is already a dataset with this signature and it is not expected
            errors.append(f"There is already a dataset with external_project_id {kwargs['external_project_id']}, "
                          f"run_name {kwargs['run_name']} and lane {kwargs['lane']}.")
    except ValidationError as e:
        # the validation error messages should be readable
        errors.extend(e.messages)

    return (dataset, errors, warnings)

def create_dataset_file(dataset: Dataset,
                        file_path: str,
                        sample_name: str,
                        release_status: int = ReleaseStatus.AVAILABLE
                        ) -> Tuple[Union[DatasetFile, None], List[str], List[str]]:
    """
    Create a new dataset_file and return it. A dataset must be creted beforehand.

    Args:
        `dataset`: The dataset to which the file is related.
        `file_path`: The path to the file on disk.
        `sample_name`: The name of the sample for which the file was created.
        `release_status`: The release status of the file (choices : Available - 0 (default), Released - 1, Blocked - 2).

    Returns:
        Tuple containing the created dataset_file, the error messages and the warning messages.
    """
    dataset_file = None
    errors = []
    warnings = []

    if release_status not in [value for value, _ in ReleaseStatus.choices]:
        errors.append(f"The release status can only be {' or '.join([f'{value} ({name})' for value, name in ReleaseStatus.choices])}.")

    if errors:
        return (dataset_file, errors, warnings)

    try:
        dataset_file = DatasetFile.objects.create(
            dataset=dataset,
            file_path=file_path,
            sample_name=sample_name,
            release_status=release_status,
            release_status_timestamp=None
        )
    except ValidationError as e:
        errors.extend(e.messages)

    return (dataset_file, errors, warnings)

def ingest_run_validation_report(report_json):
    """
    Ingest information from a json formated report submitted at the end of the run processing.
    The information provided pertaining to the data delivery (FASTQ and BAM file path)
    and run validation (metrics tied to the run) are stored in freezeman.
    
    Args:
        `report_json`: Content of the report in a valid json format.

    Returns:
        Tuple with the following content:
        `datasets`: Datasets objects created from the content of the report.
        `dataset_files`: Datasets_files created from the content of the report.
        `errors`: Errors generated during the processing.
        `warnings`: Warnings generated during the processing.
    """
    datasets = {}
    dataset_files = []
    errors = []
    warnings = []

    for error in RUN_PROCESSING_VALIDATOR.validator.iter_errors(report_json):
        if error.path[0] == "lane":
            errors.append(f'Lane must be a positive integer (e.g. "0", "1", ..., .etc). It was given "{report_json["lane"]}".')
        else:
            path = "".join(f'["{p}"]' for p in error.path)
            msg = f"{path}: {error.message}" if error.path else error.message
            errors.append(msg)
    if errors:
        return (datasets, dataset_files, errors, warnings)

    for readset in report_json["readsets"].values():
        external_project_id = readset["barcodes"][0]["PROJECT"]
        run_name = report_json["run"]
        lane = int(report_json["lane"])
        dataset_key = (external_project_id, run_name, lane)
        if dataset_key not in datasets:
            dataset, errors, warnings = create_dataset(external_project_id=external_project_id, run_name=run_name, lane=lane, replace=True)
        if errors:
            return (datasets, dataset_files, errors, warnings)
        else:
            datasets[dataset_key] = dataset

        dataset = datasets[dataset_key]

        for key in readset:
            if key not in ["sample_name", "barcodes"] and readset[key]:
                dataset_file, newerrors, newwarnings = create_dataset_file(
                    dataset=dataset,
                    file_path=readset[key],
                    sample_name=readset["sample_name"],
                )
                errors.extend(newerrors)
                warnings.extend(newwarnings)

                if errors:
                    return (datasets, dataset_files, errors, warnings)
                else:
                    dataset_files.append(dataset_file)
    
    return (datasets, dataset_files, errors, warnings)