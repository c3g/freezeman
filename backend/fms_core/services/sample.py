from fms_core.models import Sample, Container


def create_sample(name=None, volume=None, collection_site=None, creation_date=None,
                  container=None, individual=None, sample_kind=None,
                  coordinates=None,
                  alias=None, concentration=None, experimental_group=None, tissue_source=None, phenotype=None,
                  comment=None):
    sample = None
    errors = []





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