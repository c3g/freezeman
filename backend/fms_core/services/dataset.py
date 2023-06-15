from django.core.exceptions import ValidationError
from django.utils import timezone

from typing import List, Tuple, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset
from fms_core.models.readset import Readset
from fms_core.models._constants import ReleaseStatus, ValidationStatus
from fms_core.schema_validators import RUN_PROCESSING_VALIDATOR

from fms_core.services.readset import create_readset
from fms_core.services.metric import create_metrics_from_run_validation_data

def create_dataset(external_project_id: str,
                   run_name: str,
                   lane: int,
                   experiment_run_id: int = None,
                   metric_report_url: str = None,
                   replace: bool = False) -> Tuple[Union[Dataset, None], List[str], List[str]]:
    """
    Create a new dataset and return it. If an dataset exists already with the same natural key (external_project_id, run_name and lane),
    two options exist.
    Option replace (replace=True): the existing dataset is returned, but the connected datasetfiles are deleted (in order to recreate them). 
    Option ignore (replace=False): the existing dataset is returned.

    Args:
        `external_project_id`: Project id from the external system that generate projects.
        `run_name`: Name or id of the experiment run.
        `lane`: Lane (coordinate) on the experiment container.
        `experiment_run_id`: Experiment run ID, None if not recorded on Freezeman.
        `metric_report_url`: Run processing report URL.
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
        dataset, created = Dataset.objects.get_or_create(**kwargs,
                                                         defaults={"experiment_run_id": experiment_run_id,
                                                                   "metric_report_url": metric_report_url})
        if not created and replace:  # There is already a dataset with this signature but we replace it's content.
            reset_error, _ = reset_dataset_content(dataset)
            errors.extend(reset_error)
            # update optional content
            dataset.experiment_run_id = experiment_run_id
            dataset.metric_report_url = metric_report_url
            dataset.save()
        elif not created:  # There is already a dataset with this signature and it is not expected
            errors.append(f"There is already a dataset with external_project_id {kwargs['external_project_id']}, "
                          f"run_name {kwargs['run_name']} and lane {kwargs['lane']}.")
    except ValidationError as e:
        # the validation error messages should be readable
        errors.extend(e.messages)

    return dataset, errors, warnings

def reset_dataset_content(dataset: Dataset):
    """
    When a new run processing json is submitted that match the signature of an existing dataset, the related objects
    to that dataset need to be deleted to be recreated afterward. It means the dataset was regenerated. The function
    deletes all existing metrics, all dataset_files and all readsets.

    Args:
        dataset: Dataset object that need to be reset.
    Returns:
        Tuple with errors and warnings.
    """
    errors = []
    warnings = []
    try:
        for readset in Readset.objects.filter(dataset=dataset).all():
            for metric in readset.metrics.all():
                metric.delete()
            for dataset_file in readset.files.all():
                dataset_file.delete()
            readset.delete()
    except Exception as err:
        errors.append(str(err))
    return errors, warnings

def create_dataset_file(readset: Readset,
                        file_path: str,
                        validation_status: ValidationStatus = ValidationStatus.AVAILABLE,
                        release_status: ReleaseStatus = ReleaseStatus.AVAILABLE
                       ) -> Tuple[Union[DatasetFile, None], List[str], List[str]]:
    """
    Create a new dataset_file and return it. A dataset and readset must be created beforehand.

    Args:
        `readset`: Readset to which the file is related.
        `file_path`: Path to the file on disk.
        `validation_status`: Validation status of the file (choices : Available - 0 (default), Passed - 1, Failed - 2).
        `release_status`: Release status of the file (choices : Available - 0 (default), Released - 1, Blocked - 2).

    Returns:
        Tuple containing the created dataset_file, the error messages and the warning messages.
    """
    dataset_file = None
    errors = []
    warnings = []

    if not isinstance(readset, Readset):
        errors.append(f"Dataset file creation requires a valid readset instance.")
    
    if not file_path:
        errors.append(f"Missing file path for dataset file.")

    if release_status not in [value for value, _ in ReleaseStatus.choices]:
        errors.append(f"The release status can only be {' or '.join([f'{value} ({name})' for value, name in ReleaseStatus.choices])}.")

    if validation_status not in [value for value, _ in ValidationStatus.choices]:
        errors.append(f"The validation status can only be {' or '.join([f'{value} ({name})' for value, name in ValidationStatus.choices])}.")

    if errors:
        return dataset_file, errors, warnings

    dataset_file_data = {}

    try:
        dataset_file = DatasetFile.objects.create(readset=readset,
                                                  file_path=file_path,
                                                  validation_status=validation_status,
                                                  **(dict(validation_status_timestamp=timezone.now()) if validation_status != ValidationStatus.AVAILABLE else dict()), # Set timestamp if setting Status to non-default
                                                  release_status=release_status,
                                                  **(dict(release_status_timestamp=timezone.now()) if release_status != ReleaseStatus.AVAILABLE else dict())) # Set timestamp if setting Status to non-default
    except ValidationError as e:
        errors.extend(e.messages)

    return dataset_file, errors, warnings

def set_experiment_run_lane_validation_status(run_name: str, lane: int, validation_status: ValidationStatus):
    """
    Set validation_status for dataset_files of the given run and lane.

    Args:
        `run_name`: The unique experiment run name.
        `lane`: The integer that describe the lane being validated.
        `validation_status`: The validation status of the file (choices : Available - 0 (default), Passed - 1, Failed - 2).
    
    Returns:
        A tuple of the count of validation status set, errors and warnings
    """
    count_status = 0
    errors = []
    warnings = []

    timestamp = timezone.now()

    if not run_name:
        errors.append(f"Missing run name.")
    if not lane:
        errors.append(f"Missing lane.")
    if validation_status not in [value for value, _ in ValidationStatus.choices]:
        errors.append(f"The validation status can only be {' or '.join([f'{value} ({name})' for value, name in ValidationStatus.choices])}.")

    if not errors:
        for dataset in Dataset.objects.filter(run_name=run_name, lane=lane): # May be more than one dataset due to projects
            for dataset_file in DatasetFile.objects.filter(readset__dataset=dataset).all():
                dataset_file.validation_status = validation_status
                dataset_file.validation_status_timestamp = timestamp
                dataset_file.save()
                count_status += 1
    else: # Error returns None, while a non-existant run name or lane will return 0.
        return None, errors, warnings

    return count_status, errors, warnings

def get_experiment_run_lane_validation_status(run_name: str, lane: int):
    """
    Get validation_status for dataset_files of the given run and lane. All files are assumed to share the same status.

    Args:
        `run_name`: The unique experiment run name.
        `lane`: The integer that describe the lane.
    
    Returns:
        A tuple with the validation status, errors and warnings
    """
    validation_status = None
    errors = []
    warnings = []

    if not run_name:
        errors.append(f"Missing run name.")
    if not lane:
        errors.append(f"Missing lane.")

    if not errors and DatasetFile.objects.filter(readset__dataset__run_name=run_name, readset__dataset__lane=lane).exists():
        validation_status = DatasetFile.objects.filter(readset__dataset__run_name=run_name, readset__dataset__lane=lane).first().validation_status
    else:
        errors.append(f"No dataset file found matching the requested run name ({run_name}) and lane ({str(lane)}).")

    return validation_status, errors, warnings


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
    readset_by_name = {}
    errors = []
    warnings = []

    ACCEPTED_DATASET_FILE_TYPES = ["fastq_1", "fastq_2", "bam", "bai"]

    for error in RUN_PROCESSING_VALIDATOR.validator.iter_errors(report_json):
        if error.path[0] == "lane":
            errors.append(f'Lane must be a positive integer (e.g. "0", "1", ..., .etc). It was given "{report_json["lane"]}".')
        else:
            path = "".join(f'["{p}"]' for p in error.path)
            msg = f"{path}: {error.message}" if error.path else error.message
            errors.append(msg)
    if errors:
        return (datasets, dataset_files, errors, warnings)

    metric_report_url = None

    run_name = report_json["run"]
    lane = int(report_json["lane"])
    experiment_run_id = report_json.get("run_obj_id", None)
    metric_report_url = report_json["metrics_report_url"]
    for readset_name, readset in report_json["readsets"].items():
        external_project_id = readset["barcodes"][0]["PROJECT"]
        dataset_key = (external_project_id, run_name, lane)
        if dataset_key not in datasets:
            dataset, errors, warnings = create_dataset(external_project_id=external_project_id,
                                                       run_name=run_name,
                                                       lane=lane,
                                                       experiment_run_id=experiment_run_id,
                                                       metric_report_url=metric_report_url,
                                                       replace=True)
            if errors:
                return (datasets, dataset_files, errors, warnings)
            else:
                datasets[dataset_key] = dataset
        else:
            dataset = datasets[dataset_key]

        sample_name = readset["sample_name"]
        derived_sample_id = readset.get("derived_sample_obj_id", None)
        readset_obj, errors, warnings = create_readset(dataset, readset_name, sample_name, derived_sample_id)
        readset_by_name[readset_name] = readset_obj
        for key in readset:
            if key in ACCEPTED_DATASET_FILE_TYPES and readset[key]:
                dataset_file, newerrors, newwarnings = create_dataset_file(readset=readset_obj,
                                                                           file_path=readset[key])
                errors.extend(newerrors)
                warnings.extend(newwarnings)

                if errors:
                    return (datasets, dataset_files, errors, warnings)
                else:
                    dataset_files.append(dataset_file)

    for run_validation in report_json["run_validation"]:
        readset_obj = readset_by_name[run_validation["sample"]]
        _, newerrors, newwarnings = create_metrics_from_run_validation_data(readset=readset_obj,
                                                                            run_validation_data=run_validation)
        errors.extend(newerrors)
        warnings.extend(newwarnings)

    return (datasets, dataset_files, errors, warnings)