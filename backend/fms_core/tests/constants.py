from decimal import Decimal
from ..models import Individual


def create_container(barcode, location=None, coordinates="", kind="tube rack 8x12", name='TestRack001'):
    return dict(
        kind=kind,
        name=name,
        barcode=barcode,
        coordinates=coordinates,
        location=location,
        comment=''
    )


def create_sample_container(kind, name, barcode, coordinates='', location=None):
    return dict(
        kind=kind,
        name=name,
        barcode=barcode,
        coordinates=coordinates,
        location=location,
        comment=''
    )


def create_sample(sample_kind, individual, container, coordinates='', **kwargs):
    return {
        "sample_kind": sample_kind,
        "name": 'test_sample_01',
        "alias": '53',
        "individual": individual,
        "volume_history": [
            {
                "date": "2020-04-15T03:50:45.127218Z",
                "update_type": "update",
                "volume_value": "5000"
            }
        ],
        # concentration=Decimal('0.02'),
        "experimental_group": ['EG01', 'EG02'],
        "collection_site": 'Site1',
        "container": container,
        "coordinates": coordinates,
        **kwargs
    }


def create_extracted_sample(sample_kind, individual, container, extracted_from, volume_used, coordinates='',
                            **kwargs):
    return {
        'sample_kind': sample_kind,
        'name': 'test_extracted_sample_01',
        'alias': '12',
        'individual': individual,
        'volume_history': [
            {
                "date": "2020-04-15T03:50:45.127218Z",
                "update_type": "update",
                "volume_value": "0"
            }
        ],
        'concentration': Decimal('0.01'),
        'experimental_group': ['EG01'],
        'collection_site': 'Site1',
        'container': container,
        'coordinates': coordinates,
        'extracted_from': extracted_from,
        'volume_used': volume_used,
        **kwargs
    }


def create_individual(individual_name, mother=None, father=None, **kwargs):
    return {
        'name': individual_name,
        'taxon': Individual.TAXON_HOMO_SAPIENS,
        'sex': Individual.SEX_UNKNOWN,
        'mother': mother,
        'father': father,
        'cohort': 'covid-19',
        **kwargs
    }
