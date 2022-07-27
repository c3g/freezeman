from django.core.exceptions import ObjectDoesNotExist, ValidationError

from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset
from fms_core.models._constants import ReleaseFlag

def create_dataset(project_name: str, run_name: str, lane: str, files: List[Dict[str, Any]] = []) -> Tuple[Union[Dataset, None], List[str], List[str]]:
    dataset = None

    errors = []
    warnings = []

    try:
        dataset = Dataset.objects.create(
            project_name=project_name,
            run_name=run_name,
            lane=lane,
        )
    except ValidationError as e:
        # the validation error messages should be readible
        errors.extend(e.messages)
    
    
    dataset_files = []

    for file in files:
        if not errors:
            dataset_file, newerrors, newwarnings = create_dataset_file(dataset=dataset, **file)
            errors.extend(newerrors)
            warnings.extend(newwarnings)

            if dataset_file:
                dataset_files.append(dataset_file)

        dataset = None
        dataset_files = []

    return (dataset and Dataset.objects.get(pk=dataset.id), errors, warnings)

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
