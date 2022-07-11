from jsonschema import ValidationError
from django.core.exceptions import ObjectDoesNotExist

from datetime import datetime, date
from typing import Any, List, Optional, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset

def convertToModelDate(value: Union[datetime, date, str, None]):
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

def create_dataset(project_name: str, run_name: str, lane: str, files: List[Any] = []):
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
        errors.append(';'.join(e.messages))
    
    
    dataset_files = []

    for file in files:
        if not errors:
            dataset_file, newerrors, newwarnings = create_dataset_file(dataset, file['file_path'], file['sample_name'])
            errors.extend(newerrors)
            warnings.extend(newwarnings)

            if dataset_file:
                dataset_files.append(dataset_file)

    if errors:
        dataset_query().filter(id__in=dataset if dataset else []).delete()
        dataset_file_query().filter(id__in=dataset_files).delete()

        dataset = None
        dataset_files = []

    return (dataset and Dataset.objects.get(pk=dataset.id), errors, warnings)

def create_dataset_file(dataset: Dataset, file_path: str, sample_name: str):
    dataset_file = None
    errors = []
    warnings = []

    try:
        dataset_file = DatasetFile.objects.create(
            dataset=dataset,
            file_path=file_path,
            sample_name=sample_name
        )
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

def update_dataset(pk, /, project_name: Optional[str] = None, run_name: Optional[str] = None, lane: Optional[str] = None, files: List[Any] = []):
    errors = []
    warnings = []

    dataset = None

    try:
        query = Dataset.objects.filter(pk=pk)
        kwargs = {}
        if project_name:
            kwargs["project_name"] = project_name
        if run_name:
            kwargs["run_name"] = run_name
        if lane:
            kwargs["lane"] = lane
        query.update(**kwargs)
        dataset = query.get()
    except ValidationError as e:
        errors.append(';'.join(e.messages))
    except ObjectDoesNotExist:
        errors.append(f"Dataset with id '{pk}' doesn't exist")
    
    query = DatasetFile.objects.filter(id__in=[file["id"] for file in files])
    files = { file["id"]: file for file in files }
    
    for file in query:
        file.sample_name = files[file.id]["sample_name"]
        file.file_path = files[file.id]["file_path"]
        file.completion_date = convertToModelDate(files[file.id]["completion_date"])
        file.validation_date = convertToModelDate(files[file.id]["validation_date"])
        file.save()

    return  (dataset and Dataset.objects.get(pk=pk), errors, warnings)

# def update_dataset_file(pk: int, **kwargs):
#     errors = []
#     warnings = []

#     dataset_file = None

#     try:
#         query = DatasetFile.objects.filter(pk=pk)
#         query.update(**kwargs)
#         dataset_file = query.get()
#     except ValidationError as e:
#         errors.append(';'.join(e.messages))
#     except ObjectDoesNotExist:
#         errors.append(f"DatasetFile with id '{pk}' doesn't exist")
    
#     return  (dataset_file, errors, warnings)

def dataset_query():
    return Dataset.objects.all()

def dataset_file_query():
    return DatasetFile.objects.all()
