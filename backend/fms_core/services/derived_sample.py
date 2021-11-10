from django.core.exceptions import ValidationError
from django.db import Error
from fms_core.models import Biosample, DerivedSample, DerivedBySample, Sample, Container, Process

def get_single_derived_sample_from_sample(sample):
    derived_sample = None
    errors = []
    warnings = []

    dbs = DerivedBySample.objects.filter(sample_id=sample.id).first()
    ds = DerivedSample.objects.filter(id=dbs.derived_sample_id)
    if ds.count() > 1:
        errors.append(f"Multiple Derived Sample were found for Sample #{sample.__dict__}")
    else:
        derived_sample = ds.first()

    return (derived_sample, errors, warnings)


def derive_sample(sample, new_sample_data, new_derived_sample_data):
    new_sample = None
    new_derived_sample = None
    errors = []
    warnings = []

    original_derived_sample, errors, warnings = get_single_derived_sample_from_sample(sample)
    if original_derived_sample:
        try:
            new_derived_sample = DerivedSample.objects.get(id=original_derived_sample.id)
            new_derived_sample.pk = None
            new_derived_sample.__dict__.update(new_derived_sample_data)
            new_derived_sample.save()

            new_sample = Sample.objects.get(id=sample.id)
            new_sample.pk = None
            new_sample.__dict__.update(new_sample_data)
            new_sample.save()

            DerivedBySample.objects.create(sample_id=new_sample.id,
                                           derived_sample_id=new_derived_sample.id,
                                           volume_ratio=1)
        except Error as e:
            errors.append(';'.join(e.messages))

    return (new_sample, new_derived_sample, errors, warnings)