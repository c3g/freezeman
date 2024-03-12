from django.core.exceptions import ValidationError
from fms_core.models import DerivedSample, DerivedBySample
from typing import Optional


def inherit_derived_sample(derived_sample_source, new_derived_sample_data):
    new_derived_sample = None
    errors = []
    warnings = []
    
    try:
        new_derived_sample = DerivedSample.objects.get(id=derived_sample_source.id)
        new_derived_sample.derived_from_id = new_derived_sample.id
        new_derived_sample.pk = None
        new_derived_sample.__dict__.update(new_derived_sample_data)
        new_derived_sample.save()
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    return (new_derived_sample, errors, warnings)

def get_library_size_for_derived_sample(derived_sample_id: int) -> Optional[int]:
    """
    Provides the latest measured fragment_size related to a derived_sample

    Args:
        `derived_sample_id`: Derived_sample for which we want the latest measured fragment_size

    Returns:
        An integer that represents the fragment_size (library_size), None if not found or never measured.
    """
    samples_with_library_size = DerivedBySample.objects.filter(derived_sample_id=derived_sample_id, sample__fragment_size__isnull=False)
     # Most recent sample in the lineage chain will have a larger id
    ordered_samples_with_library_size = samples_with_library_size.order_by("-sample__parent_sample__id")
    library_size = ordered_samples_with_library_size.values_list("sample__fragment_size", flat=True).first()
    return library_size