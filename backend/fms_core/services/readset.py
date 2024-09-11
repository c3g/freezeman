from typing import List, Tuple

from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth.models import User

from fms_core.models import Dataset
from fms_core.models import Readset
from fms_core.models.tracked_model import ADMIN_USERNAME
from fms_core.models._constants import ReleaseStatus, ValidationStatus


def create_readset(dataset: Dataset, name: str, sample_name: str, derived_sample_id: int = None, release_status: ReleaseStatus = ReleaseStatus.AVAILABLE, validation_status: ValidationStatus = ValidationStatus.AVAILABLE,) -> Tuple[Readset, List[str], List[str]]:
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
    default_user = User.objects.get(username=ADMIN_USERNAME)

    if not isinstance(dataset, Dataset):
        errors.append(f"Creating a readset requires a valid instance of dataset.")
        return readset, errors, warnings
    if not name:
        errors.append(f"Missing readset name.")
        return readset, errors, warnings
    if not sample_name:
        errors.append(f"Missing readset sample name.")
        return readset, errors, warnings
    if release_status not in [value for value, _ in ReleaseStatus.choices]:
        errors.append(f"The release status can only be {' or '.join([f'{value} ({name})' for value, name in ReleaseStatus.choices])}.")

    try:
        readset = Readset.objects.create(dataset=dataset,
                                         name=name,
                                         sample_name=sample_name,
                                         derived_sample_id=derived_sample_id,
                                         release_status=release_status,
                                         **(dict(release_status_timestamp=timezone.now()) if release_status != ReleaseStatus.AVAILABLE else dict()), # Set timestamp if setting Status to non-default
                                         **(dict(released_by=default_user) if release_status != ReleaseStatus.AVAILABLE else dict()), # Set released_by to admin user if setting Status to non-default
                                         validation_status=validation_status,
                                         **(dict(validation_status_timestamp=timezone.now()) if validation_status != ValidationStatus.AVAILABLE else dict()), # Set timestamp if setting Status to non-default
                                         **(dict(validated_by=default_user) if validation_status != ValidationStatus.AVAILABLE else dict())) # Set validated_by to admin user if setting Status to non-default
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    return readset, errors, warnings