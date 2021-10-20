from django.core.exceptions import ValidationError

from fms_core.models import Individual

from ..utils import normalize_scientific_name


def get_or_create_individual(name,
                             sex=Individual.SEX_UNKNOWN, taxon=None, pedigree=None, cohort=None,
                             mother=None, father=None):
    individual = None
    errors = []
    warnings = []

    taxon = normalize_scientific_name(taxon)

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
        individual = Individual.objects.get(name=name)
        warnings.append(f"Using existing individual '{individual}'.")

        if sex and sex != individual.sex:
            errors.append(f"Provided sex {sex} does not match the individual sex {individual.sex} of the individual retrieved using the name {name}.")
        if taxon and taxon != individual.taxon:
            errors.append(
                f"Provided taxon {taxon} does not match the individual taxon {individual.taxon} of the individual retrieved using the name {name}.")
        if pedigree and pedigree != individual.pedigree:
            errors.append(
                f"Provided pedigree {pedigree} does not match the individual pedigree {individual.pedigree} of the individual retrieved using the name {name}.")
        if cohort and cohort != individual.cohort:
            errors.append(
                f"Provided cohort {cohort} does not match the individual cohort {individual.cohort} of the individual retrieved using the name {name}.")
        if mother and mother != individual.mother:
            errors.append(
                f"Provided mother {mother.name} does not match the individual mother {individual.mother.name if individual.mother else ''} of the individual retrieved using the name {name}.")
        if father and father != individual.father:
            errors.append(
                f"Provided father {father.name} does not match the individual father {individual.father.name if individual.father else ''} of the individual retrieved using the name {name}.")

        if errors:
            individual = None

    except Individual.DoesNotExist:
        try:
            individual = Individual.objects.create(**individual_data)
        except ValidationError as e:
            errors.append(';'.join(e.messages))


    return (individual, errors, warnings)
