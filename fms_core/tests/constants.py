from decimal import Decimal


def container(barcode, location=None):
    return dict(
        kind='tube rack 8x12',
        name='TestRack001',
        barcode=barcode,
        coordinates='',
        location=location,
        comment=''
    )


def sample_container(kind, name, barcode, coordinates='', location=None):
    return dict(
        kind=kind,
        name=name,
        barcode=barcode,
        coordinates=coordinates,
        location=location,
        comment=''
    )


def sample(individual, container, coordinates=''):
    return dict(
        biospecimen_type='BLOOD',
        name='test_sample_01',
        alias='53',
        individual=individual,
        volume_history=[
            {
                "date": "2020-04-15T03:50:45.127218Z",
                "update_type": "update",
                "volume_value": "5000"
            }
        ],
        concentration=Decimal('0.02'),
        experimental_group=['EG01', 'EG02'],
        collection_site='Site1',
        container=container,
        coordinates=coordinates
    )


def individual(name, mother=None, father=None):
    return dict(
        name=name,
        taxon='Homo sapiens',
        sex='Unknown',
        mother=mother,
        father=father,
        cohort='covid-19'
    )
