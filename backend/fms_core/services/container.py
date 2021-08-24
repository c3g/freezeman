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
        **(dict(barcode=barcode) if barcode is not None else dict()),
        **(dict(name=name) if name is not None else dict()),
        **(dict(coordinates=coordinates) if coordinates is not None else dict()),
        **(dict(kind=kind) if kind is not None else dict()),
    )

    #TODO: check sample or container creation templates where only barcode OR name is required
    #TODO: Container Kind Str Normalization
    #TODO: handle parent container / coordinates presence logic

    comment = creation_comment or (f"Automatically generated on {datetime.utcnow().isoformat()}Z")
    try:
        container, is_container_created = Container.objects.get_or_create(
            **container_data,
            defaults={'comment': f"{comment}",
                      'name': barcode or name},
        )
        if not is_container_created:
            warnings.append(f"Using existing Container with barcode '{container.barcode}'.")

    except ValidationError as e:
        errors.append(f"Could not create Container. Barcode {barcode} and kind {kind} are existing and do not match.")


    return (container, errors, warnings)