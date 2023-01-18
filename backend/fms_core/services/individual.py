from django.core.exceptions import ValidationError

from fms_core.models import Individual, Taxon, ReferenceGenome

from ..utils import normalize_scientific_name


def get_taxon(name=None, ncbi_id=None):
    taxon = None
    errors = []
    warnings = []

    if name is None and ncbi_id is None:
        errors.append(f"Taxon name or NCBI ID must be provided.")
    else:
        taxon_data = dict(
            **(dict(name=normalize_scientific_name(name)) if name is not None else dict()),
            **(dict(ncbi_id=ncbi_id) if ncbi_id is not None else dict()),
          )
        try:
            taxon = Taxon.objects.get(**taxon_data)
        except Taxon.DoesNotExist as e:
            errors.append(f"No taxon identified as {name or ncbi_id} could be found.")

    return (taxon, errors, warnings)

def get_reference_genome(assembly_name):
    """
    Returns an existing reference genome matching the given assembly name.

    Args:
        `assembly_name`: Assembly name of the reference genome including patch version.

    Returns:
        Tuple including the reference genome instance if found otherwise None, the errors and the warnings.
    """
    reference_genome = None
    errors = []
    warnings = []

    if assembly_name is None:
        errors.append(f"Assembly name must be provided.")
    else:
        try:
            reference_genome = ReferenceGenome.objects.get(assembly_name=assembly_name)
        except ReferenceGenome.DoesNotExist as e:
            errors.append(f"No reference genome identified by assembly name {assembly_name} could be found.")

    return (reference_genome, errors, warnings)

def get_or_create_individual(name, alias=None, sex=None, taxon=None, pedigree=None, cohort=None, mother=None, father=None, reference_genome=None):
    """
    Create or return an individual defined using the input parameters. If the sample exists using the name to get it, the given parameters are
    validated against the instance found. Difference would result in errors. 

    Args:
        `name`: Unique individual name given internally.
        `alias`: Optional individual name given by the client.
        `sex`: Sex of the individual (M, F, Unknown) Unknown currently include None
        `taxon`: Taxon instance associated to the individual.
        `pedigree`: Name of the pedigree.
        `cohort`: Name of the cohort.
        `mother`: Parent individual instance of F sex.
        `father`: Parent individual instance of M sex.
        `reference_genome`: Reference genome instance for that individual analysis.

    Returns:
        Tuple including the individual instance if found otherwise None, a boolean flag indicating if the individual was created,
        the errors and the warnings.
    """
    individual = None
    created_entity = False
    errors = []
    warnings = []

    if not name:
        errors.append(f"Individual name must be provided.")
    else:
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
            if alias and alias != individual.alias:
                errors.append(
                    f"Provided alias {alias} does not match the individual alias {individual.alias} of the individual retrieved using the name {name}.")
            if mother and mother != individual.mother:
                errors.append(
                    f"Provided mother {mother.name} does not match the individual mother {individual.mother.name if individual.mother else ''} of the individual retrieved using the name {name}.")
            if father and father != individual.father:
                errors.append(
                    f"Provided father {father.name} does not match the individual father {individual.father.name if individual.father else ''} of the individual retrieved using the name {name}.")
            if reference_genome and reference_genome != individual.reference_genome:
                errors.append(
                    f"Provided reference genome {reference_genome.assembly_name} does not match the individual reference genome {individual.reference_genome.assembly_name if individual.reference_genome else ''} of the individual retrieved using the name {name}.")

        except Individual.DoesNotExist:
            if taxon is not None:
                individual_data = dict(
                    name=name,
                    sex=sex or Individual.SEX_UNKNOWN,
                    taxon=taxon,
                    # Optional
                    **(dict(alias=alias) if alias is not None else dict()),
                    **(dict(pedigree=pedigree) if pedigree is not None else dict()),
                    **(dict(cohort=cohort) if cohort is not None else dict()),
                    **(dict(mother=mother) if mother is not None else dict()),
                    **(dict(father=father) if father is not None else dict()),
                    **(dict(reference_genome=reference_genome) if reference_genome is not None else dict()),
                )
                try:
                    individual = Individual.objects.create(**individual_data)
                    created_entity = True
                except ValidationError as e:
                    errors.append(';'.join(e.messages))
            else:
                errors.append(f"A taxon is required to create an individual.")

    if errors:
        individual = None

    return (individual, created_entity, errors, warnings)
