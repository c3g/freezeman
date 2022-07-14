from django.core.exceptions import ObjectDoesNotExist, ValidationError

from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple, Union

from fms_core.models.dataset_file import DatasetFile
from fms_core.models.dataset import Dataset

def convertToModelDate(value: Union[datetime, date, str, None]) -> Union[datetime, None]:
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
            dataset_file, newerrors, newwarnings = create_dataset_file(dataset, file['file_path'], file['sample_name'])
            errors.extend(newerrors)
            warnings.extend(newwarnings)

            if dataset_file:
                dataset_files.append(dataset_file)

    if errors:
        Dataset.objects.filter(id__in=dataset if dataset else []).delete()
        DatasetFile.objects.filter(id__in=dataset_files).delete()

        dataset = None
        dataset_files = []

    return (dataset and Dataset.objects.get(pk=dataset.id), errors, warnings)

def create_dataset_file(dataset: Dataset, file_path: str, sample_name: str, completion_date: Optional[datetime] = None, validation_date: Optional[datetime] = None) -> Tuple[Union[DatasetFile, None], List[str], List[str]]:
    dataset_file = None
    errors = []
    warnings = []

    try:
        dataset_file = DatasetFile.objects.create(
            dataset=dataset,
            file_path=file_path,
            sample_name=sample_name,
            completion_date=completion_date,
            validation_date=validation_date,
        )
    except ValidationError as e:
        errors.extend(e.messages)

    return (dataset_file, errors, warnings)

def update_dataset(pk, /, project_name: Optional[str] = None, run_name: Optional[str] = None, lane: Optional[str] = None, files: List[Dict[str, Any]] = [], **kwargs) -> Tuple[Tuple[Dataset, None], List[str], List[str]]:
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
        errors.extend(e.messages)
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
#         errors.extend(e.messages)
#     except ObjectDoesNotExist:
#         errors.append(f"DatasetFile with id '{pk}' doesn't exist")
    
#     return  (dataset_file, errors, warnings)
