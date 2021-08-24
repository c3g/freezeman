from django.core.exceptions import ValidationError
from fms_core.models import Sample, Container


def create_sample(name=None, volume=None, collection_site=None, creation_date=None,
                  container=None, individual=None, sample_kind=None,
                  coordinates=None,
                  alias=None, concentration=None, experimental_group=None, tissue_source=None, phenotype=None,
                  comment=None):
    sample = None
    errors = []
    warnings = []

    #TODO normalize attributes

    sample_data = dict(
        name=name,
        volume=volume,
        collection_site=collection_site,
        creation_date=creation_date,
        container=container,
        individual=individual,
        sample_kind=sample_kind,
    )

    #TODO: add optional attributes to sample_data dict

    try:
        sample = Sample.objects.create(**sample_data)
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    return (sample, errors, warnings)


def get_sample_from_container(barcode=None, coordinates=None):
    sample = None
    errors = []
    warnings = []

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

    return (sample, errors, warnings)