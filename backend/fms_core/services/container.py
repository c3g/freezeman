from datetime import datetime
from django.core.exceptions import ValidationError
from fms_core.models import Container, Sample, Coordinate, ExperimentRun
from typing import Tuple, List

from ..containers import CONTAINER_KIND_SPECS
from ..coordinates import CoordinateError

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

def is_container_valid_destination(barcode, coordinates=None, kind=None, name=None, parent_coordinates=None, container_parent=None):
    """
    is_container_valid_destination is a service function that validate the information provided to create a container but that do not actually create a container.
    It can be used to validate template submission during planning step when no database creation is expected (no dry run).

    Args:
        barcode: Container unique identifier.
        coordinates: Alphanumeric position of the sample in the container. Defaults to None.
        kind: Kind of container. Defaults to None.
        name: User defined name. Will usually be set to the same as barcode. Defaults to None.
        parent_coordinates: Alphanumeric position of the container in it's parent. Defaults to None.
        container_parent: Container in which the container is placed. Defaults to None.

    Returns:
        returns a tuple containing a validity flag (container exists or can be created.) and a list of errors and warnings.
    """
    container = None
    is_valid = True
    errors = []
    warnings = []

    if barcode:

        try:
            container = Container.objects.get(barcode=barcode)

            # Validate that the retrieved container is the right one
            if kind and kind != container.kind:
                errors.append(f"Provided container kind {kind} does not match the container kind {container.kind} of the container retrieved using the barcode {barcode}.")
            
            if name and name != container.name:
                errors.append(f"Provided container name {name} does not match the container name {container.name} of the container retrieved using the barcode {barcode}.")
            if container_parent and container_parent.id != container.location.id:
                errors.append(f"Provided parent container {container_parent.barcode} does not match the parent container {container.location.barcode} of the container retrieved using the barcode {barcode}.")
            if parent_coordinates and parent_coordinates != container.coordinates:
                errors.append(f"Provided container coordinates {parent_coordinates} do not match the container coordinates {container.coordinates} of the container retrieved using the barcode {barcode}.")

        except Container.DoesNotExist:
            if kind is None:
                errors.append(f"Kind is required to create a new container.")
            if container_parent and CONTAINER_KIND_SPECS[container_parent.kind].requires_coordinates and not parent_coordinates:
                errors.append(f"Parent container kind {container_parent.kind} requires that you provide coordinates.")
            elif container_parent and CONTAINER_KIND_SPECS[container_parent.kind].requires_coordinates:
                try:
                    CONTAINER_KIND_SPECS[container_parent.kind].validate_and_normalize_coordinates(parent_coordinates)
                except:
                    errors.append(f"Container coordinates {parent_coordinates} are not valid for parent container kind {container_parent.kind}.")
            if container_parent and not CONTAINER_KIND_SPECS[container_parent.kind].can_hold_kind(kind):
                errors.append(f"Parent container kind {container_parent.kind} cannot hold child container of kind {kind}.")

        local_kind = container.kind if container is not None else kind
        container_spec = CONTAINER_KIND_SPECS.get(local_kind, None)

        if container_spec is None:
            errors.append(f"Provided container kind {kind} is not valid.")
        else:
            if not container_spec.sample_holding:
                errors.append(f"Container kind {local_kind} cannot hold samples.")
            if coordinates is None:
                if container_spec and container_spec.requires_coordinates:
                    errors.append(f"Container coordinates are required for container kind {local_kind}.")
                elif container and Sample.objects.filter(container=container).exists():
                    errors.append(f"Container {barcode} already contains a sample.")
            else:
                try:
                    container_spec.validate_and_normalize_coordinates(coordinates)
                except CoordinateError as err:
                    errors.append(f"Sample coordinates {coordinates} are not valid for container kind {kind}.")
                if container and Sample.objects.filter(container=container, coordinate__name=coordinates).exists():
                    errors.append(f"Container coordinates {barcode}@{coordinates} already contain a sample.")
    else:
        errors.append(f"Barcode is required for any container.")

    if errors:
        is_valid = False

    return (is_valid, errors, warnings)

def get_or_create_container(barcode, kind=None, name=None, coordinates=None, container_parent=None, creation_comment=None):
    container = None
    created_entity = False
    errors = []
    warnings = []

    if barcode:
        try:
            coordinate = Coordinate.objects.get(name=coordinates) if coordinates is not None else None
        except Coordinate.DoesNotExist as err:
            errors.append(f"Provided coordinates {coordinates} are not valid (Coordinates format example: A01).")
        container_data = dict(
            **(dict(location=container_parent) if container_parent else dict()),
            **(dict(barcode=barcode) if barcode is not None else dict()),
            **(dict(name=name) if name is not None else dict(name=barcode)), # By default, a container name will be his barcode
            **(dict(coordinate=coordinate) if coordinate is not None else dict()),
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

def create_container(barcode, kind, name=None, coordinates=None, container_parent=None, creation_comment=None):
    container = None
    errors = []
    warnings = []

    if barcode:
        if Container.objects.filter(barcode=barcode).exists():
            errors.append(f"Container with barcode {barcode} already exists.")
        else:
            try:
                coordinate = Coordinate.objects.get(name=coordinates) if coordinates is not None else None
            except Coordinate.DoesNotExist as err:
                errors.append(f"Provided coordinates {coordinates} are not valid (Coordinates format example: A01).")
            container_data = dict(
                **(dict(location=container_parent) if container_parent else dict()),
                **(dict(barcode=barcode) if barcode is not None else dict()),
                **(dict(name=name) if name is not None else dict(name=barcode)), # By default, a container name will be his barcode
                **(dict(coordinate=coordinate) if coordinate is not None else dict()),
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

    try:
        destination_coordinate = Coordinate.objects.get(name=destination_coordinates) if destination_coordinates is not None else None
    except Coordinate.DoesNotExist as err:
        errors.append(f"Provided coordinates {destination_coordinates} are not valid (Coordinates format example: A01).")
        return (container_to_move, errors, warnings)

    container_to_move.location = destination_container
    container_to_move.coordinate = destination_coordinate if destination_coordinate is not None else None
    container_to_move.update_comment = update_comment

    try:
        container_to_move.save()
    except Exception as e:
        errors.append(str(e))

    return (container_to_move, errors, warnings)

def can_remove_container(container: Container) -> Tuple[bool, List[str], List[str]]:
    """
    Tests the conditions for a container to be removed. The container must not have samples stored on it,
    it must not store other containers and it must not be used in an experiment run.

    Args:
        `container`: Container instance to be tested.

    Returns:
        Tuple with the boolean is_removable, the list of errors and the list of warnings.
    """
    is_removable = False
    errors = []
    warnings = []
    if not isinstance(container, Container):
        errors.append(f"Valid container instance required.")
    else:
        has_sample_childs = Sample.objects.filter(container_id=container.id).exists()
        has_container_childs = Container.objects.filter(location_id=container.id).exists()
        used_in_experiment_run = ExperimentRun.objects.filter(container_id=container.id).exists()
        is_removable = not has_sample_childs and not has_container_childs and not used_in_experiment_run

    return is_removable, errors, warnings