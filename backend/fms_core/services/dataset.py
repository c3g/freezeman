from jsonschema import ValidationError
from django.core.exceptions import ObjectDoesNotExist

from datetime import datetime
from typing import List, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset

def create_dataset(project_name: str, run_name: str, lane: str):
    dataset = None
    errors = []
    warnings = []

    try:
        dataset_data = dict(
            project_name=project_name,
            run_name=run_name,
            lane=lane,
        )
        dataset = Dataset.objects.create(**dataset_data)
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    return (dataset, errors, warnings)

def create_dataset_file(dataset: Dataset, file_path: str, completion_date: Union[datetime, None], validation_date: Union[datetime, None], sample_name: str):
    dataset_file = None
    errors = []
    warnings = []

    try:
        dataset_file_data = dict(
            dataset=dataset,
            file_path=file_path,
            completion_date=completion_date,
            validation_date=validation_date,
            sample_name=sample_name
        )
        dataset_file = DatasetFile.objects.create(**dataset_file_data)
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    return (dataset_file, errors, warnings)

def update_dataset_file(dataset_file: DatasetFile, **kwargs):
    errors = []
    warnings = []

    dataset_file = None

    try:
        query = DatasetFile.objects.filter(pk=dataset_file.id)
        query.update(**kwargs)
        dataset_file = query.get()
    except ValidationError as e:
        errors.append(';'.join(e.messages))
    except ObjectDoesNotExist:
        errors.append(f"DatasetFile with id '{dataset_file.id}' doesn't exist")
    
    return  (dataset_file, errors, warnings)

def delete_dataset_files(*, dataset_file: Union[DatasetFile, None] = None, dataset: Union[Dataset, None] = None):
    errors = []
    warnings = []

    try:
        if dataset_file is None and dataset is None:
            errors.append("both dataset_file and dataset arguments cannot be None")
        else:
            kwargs = {}
            if dataset:
                kwargs["dataset"] = dataset
            elif dataset_file:
                kwargs["pk"] = dataset_file.id

            query = DatasetFile.objects.filter(**kwargs)
            query.delete()
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    return (errors, warnings)


def delete_dataset(dataset: Dataset):
    errors = []
    warnings = []

    try:
        newerrors, newwarnings = delete_dataset_files(dataset=dataset)
        errors.extend(newerrors)
        warnings.extend(newwarnings)

        if not errors:
            query = Dataset.objects.filter(pk=dataset.id)
            query.delete()
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    return (errors, warnings)

def dataset_to_dict(dataset: Dataset):
    return dict(
        id=dataset.id,
        project_name=dataset.project_name,
        run_name=dataset.run_name,
        lane=dataset.lane,
    )

def dataset_file_to_dict(dataset_file: DatasetFile):
    return dict(
        id=dataset_file.id,
        dataset_id=dataset_file.dataset_id,
        file_path=dataset_file.file_path,
        completion_date=dataset_file.completion_date.strftime('%Y-%m-%d') if dataset_file.completion_date else None,
        validation_date=dataset_file.validation_date.strftime('%Y-%m-%d') if dataset_file.validation_date else None,
        sample_name=dataset_file.sample_name,
    )
