from django.core.exceptions import ValidationError

from fms_core.models import Individual, Taxon

from ..utils import normalize_scientific_name


def get_taxon(name=None, ncbi_id=None):
    taxon = None
    errors = []
    warnings = []

    if name is None and ncbi_id is None:
        errors.append(f"Taxon name or NCBI ID must be provided.")
    else:
        taxon_data = dict(
            **(dict(name=normalize_scientific_name(taxon)) if name is not None else dict()),
            **(dict(ncbi_id=ncbi_id) if ncbi_id is not None else dict()),
          )
        try:
            taxon = Taxon.objects.get(**taxon_data)
        except Taxon.DoesNotExist as e:
            errors.append(f"No taxon identified as {name or ncbi_id} could be found.")

    return (taxon, errors, warnings)

def get_or_create_individual(name, sex=None, taxon=None, pedigree=None, cohort=None, mother=None, father=None):
    individual = None
    errors = []
    warnings = []

    if not name:
        errors.append(f"Individual name must be provided.")
    else:
        individual_data = dict(
            name=name,
            sex=sex or Individual.SEX_UNKNOWN,
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

        except Individual.DoesNotExist:
            try:
                individual = Individual.objects.create(**individual_data)
            except ValidationError as e:
                errors.append(';'.join(e.messages))

    if errors:
        individual = None

    return (individual, errors, warnings)
