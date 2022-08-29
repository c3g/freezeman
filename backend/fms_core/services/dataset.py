from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.models import Q

from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset
from fms_core.models._constants import ReleaseFlag

def create_dataset(project_name: str, run_name: str, lane: int, replace: bool = False) -> Tuple[Union[Dataset, None], List[str], List[str]]:
    dataset = None

    errors = []
    warnings = []

    if not (lane >= 0 and lane == int(lane)):
        errors.append("Lane must be a positive integer field")
        return (dataset, errors, warnings)

    try:
        kwargs = dict(
            project_name=project_name,
            run_name=run_name,
            lane=lane,
        )

        datasets = Dataset.objects.filter(**kwargs)

        if replace:
            DatasetFile.objects.filter(dataset__in=datasets).delete()
            # reuse dataset if it exists
            dataset = datasets.first()

        if not dataset:
            dataset = Dataset.objects.create(**kwargs)
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
        errors.append(f"The release flag can only be {' or '.join([f'{value} ({name})' for value, name in ReleaseFlag.choices])}.")

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

