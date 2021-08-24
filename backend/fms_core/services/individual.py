from django.core.exceptions import ValidationError

from fms_core.models import Individual


def get_or_create_individual(name=None, sex=Individual.SEX_UNKNOWN, taxon=None, pedigree=None, cohort=None,
                             mother=None, father=None):
    individual = None
    errors = []
    warnings = []

    #TODO: Normalize str for Individual sex and taxon

    individual_data = {
        'name': name,
        'sex': sex,
        'taxon': taxon,
    }

    if pedigree:
        individual_data['pedigree'] = pedigree
    if cohort:
        individual_data['cohort'] = cohort
    if mother:
        individual_data['mother'] = mother
    if father:
        individual_data['father'] = father

    try:
        individual, individual_created = Individual.objects.get_or_create(**individual_data)
    except ValidationError as e:
        individual_created = False
        errors.append(';'.join(e.messages))

    if individual and not individual_created:
        warnings.append(f"Using existing individual '{individual}' instead of creating a new one.")

    return (individual, errors, warnings)