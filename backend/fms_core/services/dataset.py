import json
from os import path
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth.models import User

from typing import List, Tuple, Union, TypedDict, NotRequired

from fms_core.models.experiment_run import ExperimentRun
from fms_core.models.project import Project
from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset
from fms_core.models.readset import Readset
from fms_core.models._constants import ReleaseStatus, ValidationStatus
from fms_core.models.sample_identity import SampleIdentity

from fms_report.models.production_data import ProductionData
from fms_report.models.production_tracking import ProductionTracking

from fms_core.schema_validators import RUN_PROCESSING_VALIDATOR
from fms.settings import VALIDATED_FILES_OUTPUT_PATH, RELEASED_FILES_OUTPUT_PATH
from fms_core.utils import make_timestamped_filename

from fms_core.services.readset import create_readset
from fms_core.services.metric import create_metrics_from_run_validation_data
from fms_core.services.sample_identity import create_sample_identity_matches
from fms_core.services.archived_comment import (create_archived_comment_for_model,
                                                AUTOMATED_COMMENT_DATASET_VALIDATED,
                                                AUTOMATED_COMMENT_DATASET_NEW_DATA,
                                                AUTOMATED_COMMENT_DATASET_RESET,
                                                AUTOMATED_COMMENT_DATASET_RELEASED,
                                                AUTOMATED_COMMENT_DATASET_RELEASE_REVOKED)

def create_dataset(project_id: int,
                   experiment_run_id: int,
                   lane: int,
                   metric_report_url: str = None,
                   replace: bool = False) -> Tuple[Union[Dataset, None], List[str], List[str]]:
    """
    Create a new dataset and return it. If an dataset exists already with the same natural key (project_id, experiment_run_id and lane),
    two options exist.
    Option replace (replace=True): the existing dataset is returned, but the connected datasetfiles are deleted (in order to recreate them). 
    Option ignore (replace=False): the existing dataset is returned.

    Args:
        `project_id`: Project id from Freezeman.
        `experiment_run_id`: Experiment run ID.
        `lane`: Lane (coordinate) on the experiment container.
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
            project_id=project_id,
            experiment_run_id=experiment_run_id,
            lane=lane,
        )
        dataset, created = Dataset.objects.get_or_create(**kwargs, defaults={"metric_report_url": metric_report_url})
        if not created and replace:  # There is already a dataset with this signature but we replace it's content.
            reset_error, _ = reset_dataset_content(dataset)
            errors.extend(reset_error)
            # update optional content
            dataset.metric_report_url = metric_report_url
            dataset.save()
            create_archived_comment_for_model(Dataset, dataset.id, AUTOMATED_COMMENT_DATASET_NEW_DATA()) # Set comment now for incomming data
        elif not created:  # There is already a dataset with this signature and it is not expected
            errors.append(f"There is already a dataset with project_id {kwargs['project_id']}, "
                          f"experiment_run_id {kwargs['experiment_run_id']} and lane {kwargs['lane']}.")
        else:
            create_archived_comment_for_model(Dataset, dataset.id, AUTOMATED_COMMENT_DATASET_NEW_DATA()) # Set comment now for incomming data
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
        for data in ProductionData.objects.filter(readset__dataset=dataset).all():
            data.delete()
        for tracking in ProductionTracking.objects.filter(extracted_readset__dataset=dataset).all():
            tracking.delete()
        for readset in Readset.objects.filter(dataset=dataset).all():
            for metric in readset.metrics.all():
                metric.delete()
            for dataset_file in readset.files.all():
                dataset_file.delete()
            readset.delete()
        create_archived_comment_for_model(Dataset, dataset.id, AUTOMATED_COMMENT_DATASET_RESET())
    except Exception as err:
        errors.append(str(err))
    return errors, warnings

class DatasetFileReport(TypedDict):
    final_path: NotRequired[str]
    size: int

def create_dataset_file(readset: Readset,
                        file_path: str,
                        size: int
                       ) -> Tuple[Union[DatasetFile, None], List[str], List[str]]:
    """
    Create a new dataset_file and return it. A dataset and readset must be created beforehand.

    Args:
        `readset`: Readset to which the file is related.
        `file_path`: Path to the file on disk.
        `size`: Size of the file.
        `validation_status`: Validation status of the file (choices : Available - 0 (default), Passed - 1, Failed - 2).

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
    
    if not size:
        errors.append(f"Missing size for dataset file.")
        
    if errors:
        return dataset_file, errors, warnings

    try:
        dataset_file = DatasetFile.objects.create(readset=readset,
                                                  file_path=file_path,
                                                  size=size)
    except ValidationError as e:
        errors.extend(e.messages)

    return dataset_file, errors, warnings

def set_experiment_run_lane_validation_status(experiment_run_id: int, lane: int, validation_status: ValidationStatus, validated_by: User):
    """
    Set validation_status for readsets of the given run and lane.

    Args:
        `experiment_run_id`: Freezeman Run ID.
        `lane`: The integer that describe the lane being validated.
        `validation_status`: The validation status of the readset (choices : Available - 0 (default), Passed - 1, Failed - 2).
        `validated_by`: The user that set the validation status of the readset.
    
    Returns:
        A tuple of the count of validation status set, errors and warnings
    """
    count_status = 0
    errors = []
    warnings = []

    timestamp = timezone.now()

    if not experiment_run_id:
        errors.append(f"Missing run id.")
    if not lane:
        errors.append(f"Missing lane.")
    if validation_status not in [value for value, _ in ValidationStatus.choices]:
        errors.append(f"The validation status can only be {' or '.join([f'{value} ({name})' for value, name in ValidationStatus.choices])}.")
    if validated_by is None or not isinstance(validated_by, User):
        errors.append(f"Missing validated_by.")

    if not errors:
        for dataset in Dataset.objects.filter(experiment_run_id=experiment_run_id, lane=lane): # May be more than one dataset due to projects
            for readset in Readset.objects.filter(dataset=dataset).all():
                previous_status = readset.validation_status
                readset.validation_status = validation_status
                if validation_status == ValidationStatus.AVAILABLE:
                    readset.validation_status_timestamp = None
                    readset.validated_by = None
                else:
                    readset.validation_status_timestamp = timestamp
                    readset.validated_by = validated_by
                readset.save()
                count_status += 1
            create_archived_comment_for_model(Dataset, dataset.id, AUTOMATED_COMMENT_DATASET_VALIDATED(ValidationStatus.labels[validation_status]))
            is_status_revocation = validation_status != ValidationStatus.PASSED and previous_status == ValidationStatus.PASSED # identifies dataset that get a passed status invalidation
            if validation_status == ValidationStatus.PASSED or is_status_revocation:
                _, errors_file, warnings_file = create_validation_info_file(dataset, is_status_revocation)
                errors.extend(errors_file)
                warnings.extend(warnings_file)
    else: # Error returns None, while a non-existant run name or lane will return 0.
        return None, errors, warnings

    return count_status, errors, warnings

def get_experiment_run_lane_validation_status(experiment_run_id: int, lane: int):
    """
    Get validation_status for dataset_files of the given run and lane. All files are assumed to share the same status.

    Args:
        `experiment_run_id`: Freezeman run id.
        `lane`: The integer that describe the lane.
    
    Returns:
        A tuple with the validation status, errors and warnings
    """
    validation_status = None
    errors = []
    warnings = []

    if not experiment_run_id:
        errors.append(f"Missing run id.")
    if not lane:
        errors.append(f"Missing lane.")

    if not errors and Readset.objects.filter(dataset__experiment_run_id=experiment_run_id, dataset__lane=lane).exists():
        validation_status = Readset.objects.filter(dataset__experiment_run_id=experiment_run_id, dataset__lane=lane).first().validation_status
    else:
        errors.append(f"No dataset file found matching the requested run id ({str(experiment_run_id)}) and lane ({str(lane)}).")

    return validation_status, errors, warnings

def set_dataset_release_status(dataset_id: int, readsets_release_status: dict[str, ReleaseStatus], released_by: User):
    """
    Set release_status for readsets of the given dataset.

    Args:
        `dataset_id`: Freezeman Dataset ID.
        `readsets_release_status`: dictionary mapping readset id to a valid release status (choices : Available - 0 (default), Released - 1, Blocked - 2).
        `released_by`: The user that set the release status.
    
    Returns:
        A tuple of the count of release status set, errors and warnings
    """
    count_status = 0
    released_count = 0
    readsets_released = []
    readsets_recalled = []
    is_status_reset = False
    dataset_obj = None
    errors = []
    warnings = []

    if dataset_id is None:
        errors.append(f"Missing dataset id.")
    if any([id for id, status in readsets_release_status.items() if status not in ReleaseStatus.values]):
        errors.append(f"The release status can only be {' or '.join([f'{value} ({name})' for value, name in ReleaseStatus.choices])}.")
    if released_by is None or not isinstance(released_by, User):
        errors.append(f"Missing released_by.")

    if not errors:
        try:
            dataset_obj = Dataset.objects.get(id=dataset_id)
        except Exception as e:
            errors.append(f"Failed to get Dataset {dataset_id}.")
            return None, errors, warnings # no good outcome to be expected.
        readset_ids = [int(i) for i in readsets_release_status.keys()]
        readsets = Readset.objects.filter(dataset=dataset_id, id__in=readset_ids)

        try:
            release_status_timestamp = timezone.now()
            for readset in readsets:
                release_status = readsets_release_status[str(readset.id)]
                previous_status = readset.release_status
                readset.release_status = release_status
                if release_status == ReleaseStatus.AVAILABLE:
                    readset.release_status_timestamp = None
                    readset.released_by = None
                    is_status_reset = True
                else:
                    readset.release_status_timestamp = release_status_timestamp
                    readset.released_by = released_by
                readset.save()
                is_status_revocation = release_status != ReleaseStatus.RELEASED and previous_status == ReleaseStatus.RELEASED
                if release_status == ReleaseStatus.RELEASED:
                    readsets_released.append(readset)
                    released_count += 1
                elif is_status_revocation:
                    readsets_recalled.append(readset)
                count_status += 1
        except Exception as e:
            errors.append(f"Error updating release status: {e}")
            return None, errors, warnings

        # Validate that all release status are set (released or blocked) at once.
        readsets = list(Readset.objects.filter(dataset=dataset_id).all())
        readset_count = len(readsets)
        unset_count = len([readset.id for readset in readsets if readset.release_status==ReleaseStatus.AVAILABLE])
        if unset_count > 0 and unset_count < readset_count:
            errors.append(f"Cannot set only a subset of a dataset readsets status.")
            return None, errors, warnings

        if is_status_reset: # All readsets from a dataset should be set to available together
            create_archived_comment_for_model(Dataset, dataset_id, AUTOMATED_COMMENT_DATASET_RELEASE_REVOKED())
        else: # Some readsets are released and some are blocked
            create_archived_comment_for_model(Dataset, dataset_id, AUTOMATED_COMMENT_DATASET_RELEASED(released_count, len(readset_ids) - released_count))
        
        # each status submission may include released (released readset that were blocked initially or never released) and recalled (blocked readsets that were released initially)
        _, errors_trigger, warnings_trigger = create_release_info_file(dataset_obj, readsets_released, is_release_revocation=False)
        errors.extend(errors_trigger)
        warnings.extend(warnings_trigger)
        _, errors_recall, warnings_recall = create_release_info_file(dataset_obj, readsets_recalled, is_release_revocation=True)
        errors.extend(errors_recall)
        warnings.extend(warnings_recall)
    else: # Error returns None, while a non-existant dataset will return 0.
        return None, errors, warnings

    
    return count_status, errors, warnings

def create_validation_info_file(dataset_obj: Dataset, is_validation_revocation: bool = False):
    """
    Once a dataset gets validated, creates a file that lists the deliverables to be transfered to the data delivery location.
    
    Args:
        `dataset_obj`: Dataset that has passed validation.
        `is_validation_revocation`: Boolean indicating the validation file reverts a previous validation. Defaults to False.

    Returns:
        Tuple with the following content:
        `file_path`: File path to the json in case of success otherwise None.
        `errors`: Errors generated during the processing.
        `warnings`: Warnings generated during the processing.
    """
    errors = []
    warnings = []
    file_prefix = ["validated", "invalidated"]

    if not isinstance(dataset_obj, Dataset):
        errors.append(f"create_validation_info_file requires a valid dataset object.")
        return None, errors, warnings

    dataset_id = str(dataset_obj.id)
    external_project_id = dataset_obj.project.external_id
    lane = str(dataset_obj.lane)

    filename, timestamp = make_timestamped_filename(file_prefix[is_validation_revocation] + "_" + external_project_id + "_" + dataset_id + "_" + lane + ".json")
    file_path = path.join(VALIDATED_FILES_OUTPUT_PATH, filename)
    validated_data = {"data_release_action": file_prefix[is_validation_revocation], "timestamp": timestamp, "external_project_id": external_project_id, "run_id": dataset_obj.experiment_run.id, "dataset_id": dataset_obj.id, "lane": dataset_obj.lane, "files": {}}
    dataset_files = DatasetFile.objects.filter(readset__dataset=dataset_obj)

    for dataset_file in dataset_files:
        file_definition = {"readset_id": dataset_file.readset.id, "filepath": dataset_file.file_path}
        validated_data["files"][dataset_file.id] = file_definition
    try:
        # Create file if it doesn't already exist
        with open(file_path, "x") as fp:
            fp.write(json.dumps(validated_data, indent=4))
    except Exception as err:
        file_path = None
        errors.append(f"Failed to create validation file trigger for Dataset {dataset_obj.id}. Error : {str(err)}.")

    return file_path, errors, warnings

def create_release_info_file(dataset_obj: Dataset, readsets_obj: List[Readset], is_release_revocation: bool = False):
    """
    Once readsets in a dataset gets released, creates a file that lists the deliverables to be made available to the client.
    
    Args:
        `dataset_obj`: Dataset that has data being released.
        `readsets_obj`: List of readsets that have their deliverable files ready for release to the client.
        `is_release_revocation`: Boolean indicating the list created need to revert a previous release on a subset of files. Defaults to False.

    Returns:
        Tuple with the following content:
        `file_path`: File path to the json in case of success otherwise None.
        `errors`: Errors generated during the processing.
        `warnings`: Warnings generated during the processing.
    """
    errors = []
    warnings = []
    file_prefix = ["released", "recalled"]

    if not isinstance(dataset_obj, Dataset):
        errors.append(f"create_release_info_file requires a valid dataset object.")
        return None, errors, warnings

    if not readsets_obj:
        warnings.append(f"No dataset files listed.")
        return None, errors, warnings

    dataset_id = str(dataset_obj.id)
    external_project_id = dataset_obj.project.external_id
    lane = str(dataset_obj.lane)

    filename, timestamp = make_timestamped_filename(file_prefix[is_release_revocation] + "_" + external_project_id + "_" + dataset_id + "_" + lane + ".json")
    file_path = path.join(RELEASED_FILES_OUTPUT_PATH, filename)
    released_data = {"data_release_action": file_prefix[is_release_revocation], "timestamp": timestamp, "external_project_id": external_project_id, "run_id": dataset_obj.experiment_run.id, "dataset_id": dataset_obj.id, "lane": dataset_obj.lane, "files": {}}
    dataset_files = DatasetFile.objects.filter(readset__in=readsets_obj)

    for dataset_file in dataset_files:
        file_definition = {"readset_id": dataset_file.readset.id, "filepath": dataset_file.file_path}
        released_data["files"][dataset_file.id] = file_definition
    try:
        # Create file if it doesn't already exist
        with open(file_path, "x") as fp:
            fp.write(json.dumps(released_data, indent=4))
    except Exception as err:
        file_path = None
        errors.append(f"Failed to create release file trigger for Dataset {dataset_obj.id}. Error : {str(err)}.")

    return file_path, errors, warnings    
    
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

    ACCEPTED_DATASET_FILE_TYPES = ["fastq_1", "fastq_2", "bam", "bai", "variant_inferences"]

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
    if experiment_run_id is not None:
        try:
            run_obj = ExperimentRun.objects.get(id=experiment_run_id)
        except ExperimentRun.DoesNotExist as err:
            errors.append(f"Submitted run id {experiment_run_id} does not exist.")
        if run_obj is not None:
            run_obj.external_name = run_name
            try:
                run_obj.save()
            except Exception as err:
                errors.append("Failed to save the run external name.")
        metric_report_url = report_json["metrics_report_url"]
        for readset_name, readset in report_json["readsets"].items():
            project_id = int(readset["project_obj_id"])
            try:
                Project.objects.get(id=project_id)
            except Project.DoesNotExist as err:
                errors.append(f"Submitted project id {project_id} does not exist.")
                return (datasets, dataset_files, errors, warnings)
            
            dataset_key = (project_id, experiment_run_id, lane)
            if dataset_key not in datasets:
                dataset, errors, warnings = create_dataset(project_id=project_id,
                                                           experiment_run_id=experiment_run_id,
                                                           lane=lane,
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
                    file: DatasetFileReport = readset[key]
                    if file.get('final_path') is not None and file.get('size') is not None:
                        dataset_file, newerrors, newwarnings = create_dataset_file(readset=readset_obj,
                                                                                  file_path=file['final_path'], size=file['size'])
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
            # ingest readset identity matches if they are present
            self_match = run_validation["qc"].get("self_snp_array_match", None)
            other_matches = run_validation["qc"].get("other_snp_array_matches", None)
            if not self_match is None or not other_matches is None:
                tested_biosample_id = readset_obj.derived_sample.biosample_id
                try:
                    tested_identity = SampleIdentity.objects.get(biosample_id=tested_biosample_id)
                except SampleIdentity.DoesNotExist:
                    tested_identity = None
                    errors.append(f"Sample identity for biosample {tested_biosample_id} does not exist.")
                matches_by_biosample_id = {}
                if self_match:
                    match_values = list(self_match.values())[0]
                    self_biosample_id = int(match_values["biosample_id"])
                    self_matching_site_ratio = match_values["percent_match"]
                    self_compared_sites = match_values["n_sites"]
                    matches_by_biosample_id[self_biosample_id] = {"matching_site_ratio": (Decimal(str(self_matching_site_ratio))/100).quantize(Decimal("0.00001")), "compared_sites": self_compared_sites}
                    if tested_biosample_id != self_biosample_id:
                        warnings.append(("Self match biosample ID {0} does not match current readset biosample id {1}. Ingested as matching the reported biosample {0}.", [self_biosample_id, tested_biosample_id]))
                if other_matches:
                    for other_match_values in other_matches.values():
                        other_biosample_id = int(other_match_values["biosample_id"])
                        other_matching_site_ratio = other_match_values["percent_match"]
                        other_compared_sites = other_match_values["n_sites"]
                        matches_by_biosample_id[other_biosample_id] = {"matching_site_ratio": (Decimal(str(other_matching_site_ratio))/100).quantize(Decimal("0.00001")), "compared_sites": other_compared_sites}
                        
                errors_matches, warnings_matches = create_sample_identity_matches(tested_identity, matches_by_biosample_id, readset_obj)
                errors.extend(errors_matches)
                warnings.extend(warnings_matches)

    else:
        errors.append("Experiment run ID missing.")

    return (datasets, dataset_files, errors, warnings)

def get_dataset_root_folder(dataset_id: int) -> tuple[str, list[str], list[str]]:
    """
    Function taking a dataset_id as parameter and returning the longest common path from dataset_files.

    Args:
        `dataset_id`: Dataset ID from Freezeman.

    Returns:
        Tuple with the following content:
        `root_folder_path`: String with the root folder for the dataset.
        `errors`: Errors generated during the processing.
        `warnings`: Warnings generated during the processing.
    """
    root_folder_path = None
    errors = []
    warnings = []

    file_paths = DatasetFile.objects.filter(readset__dataset_id=dataset_id).distinct().values_list("file_path", flat=True)
    try:
        root_folder_path = path.commonpath(file_paths)
    except ValueError as err:
        errors.append(f'Could not find a common path. Error: {err}.')

    return root_folder_path, errors, warnings