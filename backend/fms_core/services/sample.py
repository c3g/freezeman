import json
from datetime import datetime
from django.core.exceptions import ValidationError
from fms_core.models import Sample, Container
from ..utils import RE_SEPARATOR, float_to_decimal


def create_sample(name=None, volume=None, collection_site=None, creation_date=None,
                  container=None, individual=None, sample_kind=None,
                  coordinates=None,
                  alias=None, concentration=None, tissue_source=None, phenotype=None,
                  experimental_group=None,
                  comment=None):
    sample = None
    errors = []
    warnings = []

    sample_data = dict(
        name=name,
        volume=volume,
        collection_site=collection_site,
        creation_date=creation_date,
        container=container,
        individual=individual,
        sample_kind=sample_kind,
        comment=(comment or (f"Automatically generated on {datetime.utcnow().isoformat()}Z")),
        # Optional attributes
        **(dict(coordinates=coordinates) if coordinates is not None else dict()),
        **(dict(alias=alias) if alias is not None else dict()),
        **(dict(concentration=float_to_decimal(concentration)) if concentration is not None else dict()),
        **(dict(tissue_source=tissue_source) if tissue_source is not None else dict()),
        **(dict(phenotype=phenotype) if phenotype is not None else dict()),
    )

    if experimental_group:
        sample_data['experimental_group'] = json.dumps([
                g.strip()
                for g in RE_SEPARATOR.split(experimental_group)
                if g.strip()
            ])

    try:
        sample = Sample.objects.create(**sample_data)
    except ValidationError as e:
        errors.append(str(e))

    return (sample, errors, warnings)


def get_sample_from_container(barcode=None, coordinates=None):
    sample = None
    container = None
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



def update_sample(sample_to_update, volume=None, concentration=None, depleted=None):
    errors = []
    warnings = []

    if volume:
        sample_to_update.volume = volume
    if concentration:
        sample_to_update.concentration = float_to_decimal(concentration)
    if depleted is not None:
        sample_to_update.depleted = depleted

    try:
        sample_to_update.save()
    except Exception as e:
        errors.append(str(e))

    return (sample_to_update, errors, warnings)