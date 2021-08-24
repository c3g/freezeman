from django.core.exceptions import ValidationError

from fms_core.models import Individual


def get_or_create_individual(name=None, sex=Individual.SEX_UNKNOWN, taxon=None, pedigree=None, cohort=None,
                             mother=None, father=None):
    individual = None
    errors = []
    warnings = []

    #TODO: Normalize str for Individual sex and taxon

    individual_data = dict(
        name=name,
        sex=sex,
        taxon=taxon,
        # Optional
        **(dict(pedigree=pedigree) if pedigree is not None else dict()),
        **(dict(cohort=cohort) if cohort is not None else dict()),
        **(dict(mother=mother) if mother is not None else dict()),
        **(dict(father=father) if father is not None else dict()),
    )

    try:
        individual, is_individual_created = Individual.objects.get_or_create(**individual_data)
        if not is_individual_created:
            warnings.append(f"Using existing individual '{individual}'.")
    except ValidationError as e:
        errors.append(';'.join(e.messages))


    return (individual, errors, warnings)