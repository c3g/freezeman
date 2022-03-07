from datetime import datetime
from django.core.exceptions import ValidationError
from fms_core.models import Container

from ..containers import CONTAINER_KIND_SPECS

def get_container(barcode):
    container = None
    errors = []
    warnings = []

    if barcode:
        try:
            container = Container.objects.get(barcode=barcode)
        except Container.DoesNotExist:
            errors.append(f"Could not find Container with barcode {barcode}")
    else:
        errors.append(f"Barcode is required to get a container.")

    return (container, errors, warnings)


def get_or_create_container(barcode,
                            kind=None, name=None, coordinates=None,
                            container_parent=None, creation_comment=None):
    container = None
    created_entity = False
    errors = []
    warnings = []

    if barcode:
        container_data = dict(
            **(dict(location=container_parent) if container_parent else dict()),
            **(dict(barcode=barcode) if barcode is not None else dict()),
            **(dict(name=name) if name is not None else dict(name=barcode)), # By default, a container name will be his barcode
            **(dict(coordinates=coordinates) if coordinates is not None else dict()),
            **(dict(kind=kind) if kind is not None else dict()),
        )

        #TODO: check sample or container creation templates where only barcode OR name is required

        comment = creation_comment or (f"Automatically generated on {datetime.utcnow().isoformat()}Z")

        try:
            container = Container.objects.get(barcode=barcode)

            # Validate that the retrieved container is the right one
            if kind and kind != container.kind:
                errors.append(f"Provided container kind {kind} does not match the container kind {container.kind} of the container retrieved using the barcode {barcode}.")
            if name and name != container.name:
                errors.append(f"Provided container name {name} does not match the container name {container.name} of the container retrieved using the barcode {barcode}.")
            if container_parent and container_parent.id != container.location.id:
                errors.append(f"Provided parent container {container_parent.barcode} does not match the parent container {container.location.barcode} of the container retrieved using the barcode {barcode}.")
            if coordinates and coordinates != container.coordinates:
                errors.append(f"Provided container coordinates {coordinates} do not match the container coordinates {container.coordinates} of the container retrieved using the barcode {barcode}.")

        except Container.DoesNotExist:
            if container_parent and CONTAINER_KIND_SPECS[container_parent.kind].requires_coordinates and not coordinates:
                errors.append(f"Parent container kind {container_parent.kind} requires that you provide coordinates.")
            else:
                try:
                    container = Container.objects.create(**container_data, comment=comment)
                    created_entity = True
                # Pile up all validation error raised during the creation of the container
                except ValidationError as e:
                    errors.append(';'.join(e.messages))
    else:
        errors.append(f"Barcode is required to get or create a container.")

    if errors:
        container = None

    return (container, created_entity, errors, warnings)

def create_container(barcode, kind,
                     name=None, coordinates=None, container_parent=None, creation_comment=None):
    container = None
    errors = []
    warnings = []

    if barcode:
        if Container.objects.filter(barcode=barcode).exists():
            errors.append(f"Container with barcode {barcode} already exists.")
        else:
            container_data = dict(
                **(dict(location=container_parent) if container_parent else dict()),
                **(dict(barcode=barcode) if barcode is not None else dict()),
                **(dict(name=name) if name is not None else dict(name=barcode)), # By default, a container name will be his barcode
                **(dict(coordinates=coordinates) if coordinates is not None else dict()),
                **(dict(kind=kind) if kind is not None else dict()),
            )
            comment = creation_comment or (f"Automatically generated on {datetime.utcnow().isoformat()}Z")

            if container_parent and CONTAINER_KIND_SPECS[container_parent.kind].requires_coordinates and not coordinates:
                errors.append(f"Parent container kind {container_parent.kind} requires that you provide coordinates.")
            else:
                try:
                    container= Container.objects.create(**container_data, comment=comment)

                # Pile up all validation error raised during the creation of the container
                except ValidationError as e:
                    errors.append(';'.join(e.messages))
    else:
        errors.append(f"Barcode is required to create a container.")

    return (container, errors, warnings)

def rename_container(container_to_update, barcode=None, name=None, update_comment=None):
    errors = []
    warnings = []

    if not any([barcode, name]):
        errors.append(f'Either New Barcode or New Name are required.')
        return (container_to_update, errors, warnings)

    if barcode:
        container_to_update.barcode = barcode
    if name:
        container_to_update.name = name
    if update_comment:
        container_to_update.update_comment = update_comment

    try:
        container_to_update.save()
    except Exception as e:
        errors.append(str(e))

    return (container_to_update, errors, warnings)

def move_container(container_to_move, destination_barcode,
                   destination_coordinates=None, update_comment=None):
    destination_container = None
    errors = []
    warnings = []

    if not destination_barcode:
        errors.append(f'Destination location barcode is required.')
        return (container_to_move, errors, warnings)

    try:
        # Test for container barcode to provide a better error message.
        destination_container = Container.objects.get(barcode=destination_barcode)
    except Container.DoesNotExist as e:
        errors.append(f"Destination Container barcode {destination_barcode} does not exist.")
        return (container_to_move, errors, warnings)

    if container_to_move.location == destination_container and container_to_move.coordinates == destination_coordinates:
        errors.append(f"Container {container_to_move.name } already is at container {destination_barcode} at coodinates {destination_coordinates}.")
        return (container_to_move, errors, warnings)

    container_to_move.location = destination_container
    container_to_move.coordinates = destination_coordinates if destination_coordinates else ""
    container_to_move.update_comment = update_comment

    try:
        container_to_move.save()
    except Exception as e:
        errors.append(str(e))

    return (container_to_move, errors, warnings)