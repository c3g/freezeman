from django.db import Error
from fms_core.models import DerivedSample, DerivedBySample, Sample

def inherit_derived_sample(derived_sample_source, new_derived_sample_data):
    new_derived_sample = None
    errors = []
    warnings = []
    
    try:
        new_derived_sample = DerivedSample.objects.get(id=derived_sample_source.id)
        new_derived_sample.pk = None
        new_derived_sample.__dict__.update(new_derived_sample_data)
        new_derived_sample.save()
    except Error as e:
        errors.append(';'.join(e.messages))
    
    return (new_derived_sample, errors, warnings)

