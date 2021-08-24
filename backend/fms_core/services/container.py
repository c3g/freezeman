from datetime import datetime
from django.core.exceptions import ValidationError
from fms_core.models import Container

def get_container(barcode=None):
    container = None
    errors = []
    warnings = []

    try:
        container = Container.objects.get(barcode=barcode)
    except Container.DoesNotExist:
        errors.append(f"Could not find Container with barcode {barcode}")

    return (container, errors, warnings)


def get_or_create_container(barcode=None, kind=None, name=None, coordinates=None,
                            container_parent=None,
                            creation_comment=None):
    container = None
    errors = []
    warnings = []

    container_data = dict(
        **(dict(location=container_parent) if container_parent else dict(location__isnull=True)),
    )
    if barcode:
        container_data['barcode'] = barcode
    if name:
        container_data['name'] = name
    if coordinates:
        container_data['coordinates'] = coordinates
    if kind:
        container_data['kind'] = kind

    #TODO: Container Kind Str Normalization
    #TODO: handle parent container / coordinates presence logic

    comment = creation_comment if creation_comment else f"Automatically generated on {datetime.utcnow().isoformat()}Z"
    try:
        container, _ = Container.objects.get_or_create(
            **container_data,
            defaults={'comment': f"{comment}",
                      'name': barcode or name},
        )
    except ValidationError as e:
        errors.append(f"Could not create experiment container. Barcode {barcode} and kind {kind} are existing and do not match.")

    return (container, errors, warnings)