from django.core.exceptions import ValidationError

from fms_core.models import LibraryType, Library

from fms_core.services.sample import process_library_sample


from datetime import datetime


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


def prepare_library(library_type, library_date, platform, index, strandedness, library_volume,
                    library_comment, container, container_coordinates, source_sample, volume_used,
                    protocol, process_by_protocol):
    library = None
    errors = []
    warnings = []

    if not process_by_protocol:
        errors.append("Missing process.")
        return library, errors, warnings

    # Retrieve process
    process_obj = process_by_protocol[protocol.id]

    if not errors:
        library_obj, library_errors, library_warnings = create_library(library_type=library_type,
                                                                       index=index,
                                                                       platform=platform,
                                                                       strandedness=strandedness,)

        errors += library_errors
        warnings += library_warnings

        if library_obj and process_obj:
            sample_destination, process_library_errors, process_library_warnings = \
                process_library_sample(process=process_obj,
                                       sample_source=source_sample,
                                       container_destination=container,
                                       library=library_obj,
                                       volume_used=volume_used,
                                       execution_date=library_date,
                                       coordinates_destination=container_coordinates,
                                       volume_destination=library_volume,
                                       comment=library_comment)

            errors += process_library_errors
            warnings += process_library_warnings

    else:
        library = None

    return library, errors, warnings
