from decimal import Decimal

from backend.fms_core.models import derived_sample
from ..models import Individual, Biosample, DerivedSample, DerivedBySample, Sample
import datetime

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

def create_biosample(individual, **kwargs):
    return {
        "alias": '53',
        "individual": individual,
        "collection_site": 'Site1',
        **kwargs
    }

def create_derivedsample(biosample, sample_kind, **kwargs):
    return {
        "biosample": biosample,
        "sample_kind": sample_kind,
        "experimental_group": ['EG01', 'EG02'],
        **kwargs
    }

def create_sample(container, coordinates='', **kwargs):
    return {
        "name": 'test_sample_01',
        "volume": 5000,
        "container": container,
        "coordinates": coordinates,
        "creation_date": datetime.datetime.today(),
        **kwargs
    }

def create_fullsample(name, alias, volume, individual, sample_kind, container, coordinates=""):
    biosample = Biosample.objects.create(individual=individual, alias=alias, collection_site="Site1")
    derivedsample = DerivedSample.objects.create(biosample=biosample, sample_kind=sample_kind, experimental_group=["EG01", "EG02"])
    sample = Sample.objects.create(name=name, volume=volume, container=container, coordinates=coordinates, creation_date=datetime.datetime.today())
    derivedbysample = DerivedBySample.objects.create(derived_sample=derivedsample, sample=sample, volume_ratio=1)
    return sample


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
