from jsonschema import ValidationError
from django.core.exceptions import ObjectDoesNotExist

from datetime import datetime
from typing import Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset


def create_dataset(project_name: str, run_name: str, lane: str, file_path: str, completion_date: Union[datetime, None], validation_date: Union[datetime, None], sample_name: str):
    dataset = None
    dataset_file = None

    errors = []
    warnings = []

    try:
        dataset_data = dict(
            project_name=project_name,
            run_name=run_name,
            lane=lane,
            file_path=file_path,
            completion_date=completion_date,
            validation_date=validation_date,
            sample_name=sample_name
        )
        dataset = Dataset.objects.create(**dataset_data)

        dataset_file_data = dict(
            file_path=file_path,
            completion_date=completion_date,
            validation_date=validation_date,
            sample_name=sample_name
        )
        dataset_file = DatasetFile.objects.create(**dataset_file_data)
    except ValidationError as e:
        if dataset is not None:
            Dataset.objects.filter(pk=dataset.id).delete()

        dataset = None
        dataset_file = None

        errors.append(';'.join(e.messages))

    return (dataset, dataset_file, errors, warnings)

def update_dataset_file(dataset: Dataset, **kwargs):
    dataset = None
    errors = []
    warnings = []

    try:
        query = Dataset.objects.filter(pk=dataset.id)
        query.update(**kwargs)
        dataset = query.get()
    except ValidationError as e:
        errors.append(';'.join(e.messages))
    except ObjectDoesNotExist:
        errors.append(f"Dataset with id '{dataset.id}' doesn't exist")
    
    return  (dataset, errors, warnings)
