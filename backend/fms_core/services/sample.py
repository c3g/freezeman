from fms_core.models import Sample, Container

def get_sample_from_container(barcode=None, coordinates=None):
    errors = []
    sample = None

    try:
        container = Container.objects.get(barcode=barcode)
    except Container.DoesNotExist as e:
        errors.append(f"Sample from container with barcode {barcode} not found")

    if container:
        sample_info = dict(
            container=container
        )
        if coordinates:
            sample_info['coordinates'] = coordinates
        try:
            sample = Sample.objects.get(**sample_info)
        except Sample.DoesNotExist as e:
            errors.append(f"Sample from container with barcode {barcode} at coordinates {coordinates} not found")

    return (sample, errors)