from decimal import Decimal
from django.core.exceptions import ValidationError
from datetime import date
from fms_core.models import LibraryType, Library, DerivedBySample

from fms_core.services.sample import inherit_derived_sample, _process_sample

from fms_core.models._constants import STRANDEDNESS_CHOICES, SINGLE_STRANDED

def get_library_type(name):
    library_type = None
    errors = []
    warnings = []
    try:
        library_type = LibraryType.objects.get(name=name)
    except LibraryType.DoesNotExist as e:
        errors.append(f"No Library Type named {name} could be found.")
    except LibraryType.MultipleObjectsReturned as e:
        errors.append(f"More than one Library Type was found with the name {name}.")

    return library_type, errors, warnings


def create_library(library_type, index, platform, strandedness, library_size=None):
    library = None
    errors = []
    warnings = []

    if not library_type:
        errors.append('Missing library type.')
        return library, errors, warnings

    if not index:
        errors.append('Missing index.')
        return library, errors, warnings

    if not platform:
        errors.append('Missing platform.')
        return library, errors, warnings

    if not strandedness:
        errors.append('Missing strandedness.')
        return library, errors, warnings

    try:
        library = Library.objects.create(library_type=library_type,
                                         library_size=library_size,
                                         index=index,
                                         platform=platform,
                                         strandedness=strandedness)
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    return library, errors, warnings


def convert_library(process, platform, sample_source, container_destination, coordinates_destination, volume_used,
                    volume_destination, execution_date, comment):
    library_destination = None
    errors = []
    warnings = []

    if not process:
        errors.append(f"Process is required.")
    if not platform:
        errors.append(f"Platform is required.")
    if not sample_source:
        errors.append(f"Source sample is required.")
    if not container_destination:
        errors.append(f"Destination container is required.")
    if volume_used is None:
        errors.append(f"Volume used is required.")
    if volume_destination is None:
        errors.append(f"Volume destination is required.")
    else:
        if volume_used <= 0:
            errors.append(f"Volume used ({volume_used}) is invalid.")
        if sample_source and volume_used > sample_source.volume:
            errors.append(
                f"Volume used ({volume_used}) exceeds the current volume of the library ({sample_source.volume}).")

    if not isinstance(execution_date, date):
        errors.append(f"Execution date is not valid.")

    # Retrieve library object linked to the source sample
    library_source_obj = sample_source.derived_sample_not_pool.library
    if not sample_source.is_library or library_source_obj is None:
        errors.append(f"Sample in container {sample_source.name} is not a library.")
    elif library_source_obj.platform == platform:
        errors.append(f"Source library platform and destination library platform can't be the same.")

    if not errors:
        try:
            sample_source.volume = sample_source.volume - volume_used
            sample_source.save()

            sample_destination_data = dict(
                container_id=container_destination.id,
                coordinates=coordinates_destination if coordinates_destination else "",
                creation_date=execution_date,
                concentration=None,
                volume=volume_destination,
                depleted=False,
                # Reset QC flags
                quantity_flag=None,
                quality_flag=None
            )

            derived_samples_destination = []
            volume_ratios = {}
            for derived_sample_source in sample_source.derived_samples.all():
                # Create new destination library for each derived sample
                library_destination, errors_library_destination, warnings_library_destinations = \
                    create_library(library_type=library_source_obj.library_type,
                                   library_size=library_source_obj.library_size,
                                   index=library_source_obj.index,
                                   platform=platform,
                                   strandedness=SINGLE_STRANDED)

                new_derived_sample_data = {
                    "library_id": library_destination.id
                }
                new_derived_sample, errors_inherit, warnings_inherit = inherit_derived_sample(derived_sample_source,
                                                                                              new_derived_sample_data)
                errors.extend(errors_inherit)
                warnings.extend(warnings_inherit)

                derived_samples_destination.append(new_derived_sample)
                volume_ratios[new_derived_sample.id] = DerivedBySample.objects.get(sample=sample_source,
                                                                                   derived_sample=derived_sample_source).volume_ratio

            sample_destination, errors_process, warnings_process = _process_sample(process,
                                                                                   sample_source,
                                                                                   sample_destination_data,
                                                                                   derived_samples_destination,
                                                                                   volume_ratios,
                                                                                   execution_date,
                                                                                   volume_used,
                                                                                   comment)
            errors.extend(errors_process)
            warnings.extend(warnings_process)

        except Exception as e:
            errors.append(e)

    return library_destination, errors, warnings

def update_library(sample, **kwargs):
    errors = []
    warnings = []

    if sample is None:
        errors.append('Missing sample')
    elif not sample.is_library:
        errors.append('Sample {sample.name} is not a library')
    else:
        try:
            library = sample.derived_sample_not_pool.library

            if 'library_type' in kwargs:
                library.library_type = kwargs['library_type']
                pass

            if 'platform' in kwargs:
                library.platform = kwargs['platform']
                pass

            if 'index' in kwargs:
                library.index = kwargs['index']
                pass

            if 'strandedness' in kwargs:
                strandedness = kwargs['strandedness']
                if strandedness is None or strandedness in STRANDEDNESS_CHOICES:
                    library.strandedness = strandedness
                else:
                    errors.append(f'Unexpected value for strandedness ({strandedness})')
                    
            if 'library_size' in kwargs:
                library_size = kwargs['library_size']
                if library_size is not None:
                    library_size = Decimal(kwargs['library_size'])
                library.library_size = library_size

            library.save()
            
        except Exception as e:
            errors.append(str(e))

    return sample, errors, warnings
