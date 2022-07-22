from django.core.exceptions import ObjectDoesNotExist, ValidationError

from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset

def create_dataset(project_name: str, run_name: str, lane: str, files: List[Dict[str, Any]] = []) -> Tuple[Union[Dataset, None], List[str], List[str]]:
    dataset = None

    errors = []
    warnings = []

    try:
        _ = int(lane)
        dataset = Dataset.objects.create(
            project_name=project_name,
            run_name=run_name,
            lane=lane,
        )
    except ValidationError as e:
        errors.extend(e.messages)
    except ValueError as e:
        errors.append(f"Lane is '{lane}' which is not an integer")
    
    
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
                        release_flag: int = DatasetFile.ReleaseFlag.BLOCK
                        ) -> Tuple[Union[DatasetFile, None], List[str], List[str]]:
    dataset_file = None
    errors = []
    warnings = []

    try:
        RELEASE = DatasetFile.ReleaseFlag.RELEASE
        dataset_file = DatasetFile.objects.create(
            dataset=dataset,
            file_path=file_path,
            sample_name=sample_name,
            release_flag=release_flag,
            release_flag_timestamp=datetime.now() if release_flag == RELEASE else None
        )
    except ValidationError as e:
        errors.extend(e.messages)

    return (dataset_file, errors, warnings)
