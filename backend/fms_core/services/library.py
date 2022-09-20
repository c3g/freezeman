from decimal import Decimal
from django.core.exceptions import ValidationError
from datetime import date
from fms_core.models import LibraryType, Library, DerivedBySample

from fms_core.services.sample import inherit_derived_sample, _process_sample

from fms_core.utils import convert_concentration_from_nm_to_ngbyul, convert_concentration_from_ngbyul_to_nm

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
    if not sample_source.is_library:
        errors.append(f"Sample {sample_source.name} is not a library or a pool of libraries.")

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
                library_source_obj = derived_sample_source.library
                # extra validation
                if library_source_obj is None:
                    errors.append(f"Pool {sample_source.name} contains a sample {derived_sample_source.biosample.alias} that is not a library.")

                elif library_source_obj.platform == platform:
                    errors.append(f"Source library platform and destination library platform can't be the same.")

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


def update_library(derived_sample, **kwargs):
    errors = []
    warnings = []

    if derived_sample is None:
        errors.append('Missing derived sample.')
    elif not derived_sample.library:
        errors.append(f"Sample is not a library or a pool of libraries.")
    else:
        try:
            library = derived_sample.library

            if 'library_type' in kwargs:
                library.library_type = kwargs['library_type']

            if 'platform' in kwargs:
                library.platform = kwargs['platform']

            if 'index' in kwargs:
                library.index = kwargs['index']

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

    return derived_sample, errors, warnings


def convert_library_concentration_from_nm_to_ngbyul(source_sample, concentration_nm):
    """
                 Converts the concentration of a library from nM to ng/uL by calculating each partial concentration
                 of the derived samples and adjusting it with their respective volume ratio.

                 Args:
                     `sample_source`: The source library to be converted.
                     `concentration_nm`: The library concentration in nM.

                 Returns:
                     The resulting concentration in ng/uL
            """
    errors = []
    warnings = []

    if source_sample is None:
        errors.append(f'Missing sample.')

    final_concentration = 0
    for derived_sample in source_sample.derived_samples.all():
        # Compute the size of each library and its volume ratio
        library = derived_sample.library
        volume_ratio = DerivedBySample.objects.get(derived_sample=derived_sample, sample=source_sample).volume_ratio
        if library.library_size and library.strandedness:
            # Convert the concentration
            partial_concentration = convert_concentration_from_nm_to_ngbyul(concentration_nm,
                                                                            library.molecular_weight_approx,
                                                                            library.library_size)
            if partial_concentration is None:
                errors.append(f'Failed to convert the concentration of this library {source_sample.name}.')
                return None, errors, warnings
            else:
                # Adjust the concentration according to its volume ratio
                adjusted_concentration = partial_concentration * volume_ratio
                final_concentration += adjusted_concentration
        else:
            errors.append(f'Either library size or strandedness has not been set for this library.')
            return None, errors, warnings
    return final_concentration, errors, warnings


def convert_library_concentration_from_ngbyul_to_nm(source_sample, concentration_ngbyul):
    """
                 Converts the concentration of a library from ng/uL to nM by calculating each partial concentration
                 of the derived samples and adjusting it with their respective volume ratio.

                 Args:
                     `sample_source`: The source library to be converted.
                     `concentration_nm`: The library concentration in ng/uL.

                 Returns:
                     The resulting concentration in nM
            """
    errors = []
    warnings = []

    if source_sample is None:
        errors.append(f'Missing sample.')

    sum_adjusted_factor = 0
    for derived_sample in source_sample.derived_samples.all():
        # Compute the size of each library and its volume ratio
        library = derived_sample.library
        volume_ratio = DerivedBySample.objects.get(derived_sample=derived_sample, sample=source_sample).volume_ratio
        if library.library_size and library.strandedness:
            # Convert the concentration
            adjusted_factor = (library.library_size * library.molecular_weight_approx * volume_ratio)
            sum_adjusted_factor += adjusted_factor
        else:
            errors.append(f'Either library size or strandedness has not been set for this library.')
            return None, errors, warnings
    concentration_nm = (concentration_ngbyul * 1000000) / sum_adjusted_factor
    return concentration_nm, errors, warnings
