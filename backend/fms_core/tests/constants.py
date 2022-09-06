from ..models import Individual, Biosample, DerivedSample, DerivedBySample, Sample, Taxon
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
        "alias": "53",
        "individual": individual,
        "collection_site": "Site1",
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
        "comment": "",
        **kwargs
    }

def create_fullsample(name, alias, volume, individual, sample_kind, container, coordinates="", tissue_source=None, concentration=None):
    biosample = Biosample.objects.create(individual=individual, alias=alias, collection_site="Site1")
    derivedsample = DerivedSample.objects.create(biosample=biosample,
                                                 sample_kind=sample_kind,
                                                 experimental_group=["EG01"],
                                                 tissue_source=tissue_source)
    sample = Sample.objects.create(name=name,
                                   volume=volume,
                                   concentration=concentration,
                                   container=container,
                                   coordinates=coordinates,
                                   creation_date=datetime.datetime.today())
    derivedbysample = DerivedBySample.objects.create(derived_sample=derivedsample, sample=sample, volume_ratio=1)
    return sample


def create_individual(individual_name, mother=None, father=None, **kwargs):
    taxon = Taxon.objects.get(name="Homo sapiens")
    return {
        'name': individual_name,
        'taxon': taxon, # Matching TAXON_HOMO_SAPIENS
        'sex': Individual.SEX_UNKNOWN,
        'mother': mother,
        'father': father,
        'cohort': 'covid-19',
        **kwargs
    }

def create_dataset(external_project_id, run_name, lane):
    return {
        'external_project_id': external_project_id,
        'run_name': run_name,
        'lane': lane,
    }

def create_dataset_file(dataset, file_path, sample_name, release_status=0, release_status_timestamp=None):
    return {
        'dataset': dataset,
        'file_path': file_path,
        'sample_name': sample_name,
        'release_status': release_status,
        'release_status_timestamp': release_status_timestamp,
    }