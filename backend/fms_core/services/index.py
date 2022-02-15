from fms_core.models import Index, IndexSet, IndexStructure, Sequence, SequenceByIndex3Prime, SequenceByIndex5Prime

from django.core.exceptions import ValidationError

def get_or_create_index_set(set_name):
    index_set = None
    created_entity = False
    errors = []
    warnings = []

    if set_name:
        try:
            index_set = IndexSet.objects.get(name=set_name)

        except IndexSet.DoesNotExist:
            try:
                index_set = IndexSet.objects.create(name=set_name)
                created_entity = True
            # Pile up all validation error raised during the creation of the container
            except ValidationError as e:
                errors.append(';'.join(e.messages))
    else:
        errors.append(f"The name of the set is required to get or create a set.")

    return (index_set, created_entity, errors, warnings)

def create_index(index_set, index_name, index_structure):
    index = None
    errors = []
    warnings = []

    index_structure_obj = None
    if index_structure:
        try:
            index_structure_obj = IndexStructure.objects.get(name=index_structure)
        except IndexStructure.DoesNotExist:
            errors.append(f"Invalid index structure.")
            return index, errors, warnings

        try:
            index = Index.objects.create(index_set=index_set, name=index_name, index_structure=index_structure_obj)
        except ValidationError as e:
            errors.append(';'.join(e.messages))

        return index, errors, warnings


    else:
        errors.append(f"Index structure is needed to create an index.")


def create_indices_3prime_by_sequence(index, index_3prime):
    indices_3prime_by_sequence = None
    errors = []
    warnings = []

    if not index:
        errors.append(f"Index is required.")
        return indices_3prime_by_sequence, errors, warnings

    for value in index_3prime.split(','):
        try:
            sequence = Sequence.objects.create(value=value)
        except Exception as e:
            errors.append(';'.join(e.messages))

        if sequence:
            try:
                indices_3prime_by_sequence = SequenceByIndex3Prime.objects.create(index=index, sequence=sequence)
            except ValidationError as e:
                errors.append(';'.join(e.messages))

    return (indices_3prime_by_sequence, errors, warnings)

def create_indices_5prime_by_sequence(index, index_5prime):
    indices_5prime_by_sequence = None
    errors = []
    warnings = []

    if not index:
        errors.append(f"Index is required.")
        return indices_5prime_by_sequence, errors, warnings

    for value in index_5prime.split(','):
        try:
            sequence = Sequence.objects.create(value=value)
        except Exception as e:
            errors.append(';'.join(e.messages))

        if sequence:
            try:
                indices_5prime_by_sequence = SequenceByIndex5Prime.objects.create(index=index, sequence=sequence)
            except ValidationError as e:
                errors.append(';'.join(e.messages))

    return (indices_5prime_by_sequence, errors, warnings)

