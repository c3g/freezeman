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

def update_qc_flags(sample, quantity_flag, quality_flag):
    errors = []
    warnings = []

    try:
        derived_sample = sample.derived_sample_not_pool
        if derived_sample:
            if quantity_flag and quality_flag:
                derived_sample.quantity_flag = (quantity_flag == 'Passed')
                derived_sample.quality_flag = (quality_flag == 'Passed')
                derived_sample.save()
            else:
                errors['flags'] = 'Quantity and Quality flags are required.'
    except Error as e:
        errors.appends(';'.join(e.messages))

    return (derived_sample, errors, warnings)

