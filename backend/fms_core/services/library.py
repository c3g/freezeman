from django.core.exceptions import ValidationError

from fms_core.models import LibraryType, Library

from fms_core.services.process import create_process
from fms_core.services.container import create_container, get_container
from fms_core.services.sample import transfer_sample
from fms_core.services.property_value import create_process_properties

from datetime import datetime


def get_library_type(name):
    instrument = None
    errors = []
    warnings = []
    try:
        library_type = LibraryType.objects.get(name=name)
    except LibraryType.DoesNotExist as e:
        errors.append(f"No Experiment Type named {name} could be found.")
    except LibraryType.MultipleObjectsReturned as e:
        errors.append(f"More than one Experiment Type was found with the name {name}.")

    return instrument, errors, warnings


def create_library_batch(library_type, library_size, platform, library_date,
                         library_rows_info, protocol, process_properties, comment):
    library = None
    errors = []
    warnings = []

    if not library_type:
        errors['library_type'] = "Invalid library type"
        return library, errors, warnings

    process, process_errors, process_warnings = \
        create_process(protocol=protocol,
                       creation_comment=comment if comment else f"Automatically generated via library preparation "
                                                                f"on {datetime.utcnow().isoformat()}Z",)

    # Create process' properties
    if not process_errors:
        properties, properties_errors, properties_warnings = create_process_properties(process_properties,
                                                                                       process)

    errors += process_errors + properties_errors
    warnings += process_warnings + properties_warnings

    if not errors:
        for library_info in library_rows_info:
            source_sample = library_info['sample_obj']
            library_volume = library_info['volume']
            index = library_info['index']
            volume_used = library_info['volume_used']
            comment = library_info['comment']
            volume_destination = 0  # prevents this sample from being re-used or re-transferred afterwards

            try:
                library = Library.objects.create(library_type=library_type,
                                                 library_size=library_size,
                                                 index=index,
                                                 platform=platform)
            except ValidationError as e:
                errors.append(';'.join(e.messages))

            if library:
                container = library_info['container']
                container_coordinates = container['coordinates']

                container_obj = None
                if container['parent_barcode']:
                    container_parent_obj = get_container(barcode=container['parent_barcode'])

                container_obj, errors['library_container'], warnings['library_container'] = create_container(
                    name=container['name'],
                    barcode=container['barcode'],
                    kind=container['kind'],
                    container_parent=container_parent_obj if container_obj else None,
                    coordinates=container['parent_coordinates'] if container_obj else None,
                    creation_comment=comment)

                sample_destination, transfer_errors, transfer_warnings = \
                    transfer_sample(process=process,
                                    sample_source=source_sample,
                                    container_destination=container_obj,
                                    volume_used=volume_used,
                                    execution_date=library_date,
                                    coordinates_destination=container_coordinates,
                                    volume_destination=library_volume,
                                    comment=comment)

                if sample_destination:
                    sample_destination.depleted = True  # deplete destination sample
                    sample_destination.save()

                errors += transfer_errors
                warnings += transfer_warnings

    if errors:
        process = None

    return process, errors, warnings
