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
        errors.append(';'.join(e.messages))
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
        errors.append(';'.join(e.messages))

    return (dataset_file, errors, warnings)

def create_from_run_processing(run_processing_metrics: Dict[str, Any], completion_date: str, validation_date: str) -> Tuple[List[Dataset], List[DatasetFile], List[str], List[str]]:
    def main():
        rpm = run_processing_metrics

        datasets = []
        dataset_files = []
        errors = []
        warnings = []

        rpm_keys = [ "run_validation", "run", "lane", "readsets" ]
        for key in rpm_keys:
            if key not in rpm:
                errors.append(f"Missing key '{key}' the run processing metric")
        if errors:
            return (datasets, dataset_files, errors, warnings)

        for rv in rpm["run_validation"]:
            rv_keys = [ "project", "sample" ]
            for key in rv_keys:
                if key not in rv:
                    errors.append(f"Missing key '{key}' in 'run_validation' for run processing metrics '{rpm['run']}'")
            if errors:
                return (datasets, dataset_files, errors, warnings)

            dataset, errors, warnings = create_dataset(project_name=rv["project"], run_name=rpm["run"], lane=rpm["lane"], files=[])
            if errors:
                return (datasets, dataset_files, errors, warnings)
            else:
                datasets.append(dataset)

            for readset in rpm["readsets"].values():
                readset_keys = [ "sample_name" ]
                for key in readset_keys:
                    if key not in readset:
                        errors.append(f"Missing key '{key}' in 'readsets' for run processing metrics '{rpm['run']}'")
                if errors:
                    return (datasets, dataset_files, errors, warnings)

                # TODO: actually find the closest matching sample_name?
                if readset["sample_name"] in rv["sample"]:
                    for key in readset:
                        try:
                            if key not in ["sample_name", "barcodes"]:
                                dataset_file, newerrors, newwarnings = create_dataset_file(
                                    dataset=dataset,
                                    file_path=readset[key],
                                    sample_name=readset["sample_name"],
                                    completion_date=completion_date and date.fromisoformat(completion_date),
                                    validation_date=validation_date and date.fromisoformat(validation_date),
                                )
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
    datasets, dataset_files, errors, warnings = main()
    if errors:
        Dataset.objects.filter(id__in=[d.id for d in datasets]).delete()
        DatasetFile.objects.filter(id__in=[d.id for d in dataset_files]).delete()
        datasets = []
        dataset_files = []
    
    return (datasets, dataset_files, errors, warnings)

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
