from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.models import Q

from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset
from fms_core.models._constants import ReleaseFlag

def create_dataset(project_name: str, run_name: str, lane: int) -> Tuple[Union[Dataset, None], List[str], List[str]]:
    dataset = None

    errors = []
    warnings = []

    if not (lane >= 0 and lane == int(lane)):
        errors.append("Lane must be a positive integer field")
        return (dataset, errors, warnings)

    try:
        dataset = Dataset.objects.create(
            project_name=project_name,
            run_name=run_name,
            lane=lane,
        )
    except ValidationError as e:
        # the validation error messages should be readible
        errors.extend(e.messages)

    return (dataset, errors, warnings)

def create_dataset_file(dataset: Dataset,
                        file_path: str,
                        sample_name: str,
                        release_flag: int = ReleaseFlag.BLOCK
                        ) -> Tuple[Union[DatasetFile, None], List[str], List[str]]:
    dataset_file = None
    errors = []
    warnings = []

    if release_flag not in [value for value, _ in ReleaseFlag.choices]:
        errors.append("The release flag can only be 1 (Blocked) or 2 (Released)")

    if errors:
        return (dataset_file, errors, warnings)

    try:
        dataset_file = DatasetFile.objects.create(
            dataset=dataset,
            file_path=file_path,
            sample_name=sample_name,
            release_flag=release_flag,
            release_flag_timestamp=datetime.now() if release_flag == ReleaseFlag.RELEASE else None
        )
    except ValidationError as e:
        errors.extend(e.messages)

    return (dataset_file, errors, warnings)

def set_release_flag(dataset: int, release_flag: int, exceptions: List[int] = []) -> None:
    # set release flag of all files except exceptions
    files = DatasetFile.objects.filter(dataset=dataset).filter(~Q(id__in=exceptions))
    files.update(
        release_flag=release_flag,
        release_flag_timestamp=datetime.now() if release_flag == ReleaseFlag.RELEASE else None
    )
    
    # set release flag of exceptions to the opposite flag
    files = DatasetFile.objects.filter(id__in=exceptions)
    opposite_flag = [None, ReleaseFlag.BLOCK, ReleaseFlag.RELEASE][release_flag]
    files.update(
        release_flag=opposite_flag,
        release_flag_timestamp=datetime.now() if opposite_flag == ReleaseFlag.RELEASE else None
    )
