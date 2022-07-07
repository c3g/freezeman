from jsonschema import ValidationError
from django.core.exceptions import ObjectDoesNotExist

from datetime import datetime, date
from typing import List, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset

def convertToDatetime(value: Union[str, datetime, date]):
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    elif isinstance(value, datetime):
        return value
    elif isinstance(value, str):
        return datetime.fromisoformat(value[:10])
    elif value is None:
        return value
    else:
        raise ValueError(f"Invalid date: {value}")

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

def create_from_run_processing(run_processing_metrics, completion_date, validation_date):
    rpm = run_processing_metrics

    datasets = []
    dataset_files = []
    errors = []
    warnings = []

    for rv in rpm["run_validation"]:
        if errors:
            break

        dataset_args = {
            "project_name": rv["project"],
            "run_name": rpm["run"],
            "lane": rpm["lane"],
        }
        dataset, errors, warnings = create_dataset(**dataset_args)
        if errors:
            return (datasets, dataset_files, errors, warnings)
        else:
            datasets.append(dataset)

        for readset in rpm["readsets"].values():

            # TODO: actually find the closest matching sample_name
            if readset["sample_name"] in rv["sample"]:
                for key in readset:
                    try:
                        if key not in ["sample_name", "barcodes"]:
                            dataset_file_args = {
                                "dataset": dataset,
                                "file_path": readset[key],
                                "completion_date": completion_date and date.fromisoformat(completion_date),
                                "validation_date": validation_date and date.fromisoformat(validation_date),
                                "sample_name": readset["sample_name"],
                            }
                            dataset_file, newerrors, newwarnings = create_dataset_file(**dataset_file_args)
                            errors.extend(newerrors)
                            warnings.extend(newwarnings)

                            if errors:
                                return (datasets, dataset_files, errors, warnings)
                            else:
                                dataset_files.append(dataset_file)
                    except ValueError as e:
                        errors.append(f"Invalid date: {e}")
                        return (datasets, dataset_files, errors, warnings)
        
    return (datasets, dataset_files, errors, warnings)

def update_dataset(pk: int, **kwargs):
    errors = []
    warnings = []

    dataset = None

    try:
        query = Dataset.objects.filter(pk=pk)
        query.update(**kwargs)
        dataset = query.get()
    except ValidationError as e:
        errors.append(';'.join(e.messages))
    except ObjectDoesNotExist:
        errors.append(f"Dataset with id '{pk}' doesn't exist")
    
    return  (dataset, errors, warnings)

def update_dataset_file(pk: int, **kwargs):
    errors = []
    warnings = []

    dataset_file = None

    try:
        query = DatasetFile.objects.filter(pk=pk)
        query.update(**kwargs)
        dataset_file = query.get()
    except ValidationError as e:
        errors.append(';'.join(e.messages))
    except ObjectDoesNotExist:
        errors.append(f"DatasetFile with id '{pk}' doesn't exist")
    
    return  (dataset_file, errors, warnings)

def dataset_query():
    return Dataset.objects.all()

def dataset_file_query():
    return DatasetFile.objects.all()
