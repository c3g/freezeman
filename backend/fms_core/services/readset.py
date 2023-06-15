from typing import List, Tuple

from django.core.exceptions import ValidationError

from fms_core.models import Dataset
from fms_core.models import Readset


def create_readset(dataset: Dataset, name: str, sample_name: str, derived_sample_id: int = None) -> Tuple[Readset, List[str], List[str]]:
    """
    Creates a readset instance to tie in the dataset files and metrics received from the run processing JSON.

    Args:
        `dataset`: Dataset object instance for the readset.
        `name`: Readset identifier given in the run processing JSON.
        `sample_name`: Sample name associated to the readset, may not match sample name in Freezeman.
        `derived_sample_id`: Derived sample ID passed down to the run processing using the run info file. Defaults to None.

    Returns:
        Tuple with the created readset if successfully created otherwise None, errors and warnings
    """
    readset = None
    errors = []
    warnings = []

    if not isinstance(dataset, Dataset):
        errors.append(f"Creating a readset requires a valid instance of dataset.")
        return readset, errors, warnings
    if not name:
        errors.append(f"Missing readset name.")
        return readset, errors, warnings
    if not sample_name:
        errors.append(f"Missing readset sample name.")
        return readset, errors, warnings

    try:
        readset = Readset.objects.create(dataset=dataset,
                                         name=name,
                                         sample_name=sample_name,
                                         derived_sample_id=derived_sample_id)
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    return readset, errors, warnings