from typing import Set

from fms_core.models import Index, IndexBySet, IndexSet, IndexStructure, Sequence, SequenceByIndex3Prime, SequenceByIndex5Prime, DerivedSample, Sample
from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE, STANDARD_SEQUENCE_FIELD_LENGTH
from django.core.exceptions import ValidationError
from fms_core.services.library import update_library


def get_index(name):
    index = None
    errors = []
    warnings = []
    try:
        index = Index.objects.get(name=name)
    except Index.DoesNotExist as e:
        errors.append(f"No index named {name} could be found.")
    except Index.MultipleObjectsReturned as e:
        errors.append(f"More than one index was found with the name {name}.")

    return index, errors, warnings

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
            except ValidationError as e:
                errors.append(';'.join(e.messages))

    return index_set, created_entity, errors, warnings


def create_index(index_name: str, index_structure: str, index_set: IndexSet = None, external_index_name: str = None):
    """
    Create an index model with the provided index_structure and set.

    Args:
        `index_name`: Name of the index.
        `index_structure`: Name of the index structure.
        `index_set`: Optional Index set instance. Defaults to None.
        `external_index_name`: Optional External Index Name given by vendor. Defaults to None.

    Returns:
        Tuple including the created index instance as well as a list of errors and warnings.
    """
    index = None
    errors = []
    warnings = []

    index_structure_obj = None
    if index_structure:
        try:
            index_structure_obj = IndexStructure.objects.get(name=index_structure)
        except IndexStructure.DoesNotExist:
            errors.append(f"Invalid index structure.")
    else:
        errors.append(f"Index structure is needed to create an index.")

    if not errors:
        index_data = dict(
            name=index_name,
            index_structure=index_structure_obj,
            # Optional attributes
            **(dict(external_name=external_index_name) if external_index_name is not None else dict())
        )
        try:
            index = Index.objects.create(**index_data)
        except ValidationError as e:
            errors.append(';'.join(e.messages))

    if index is not None and not errors and index_set is not None:
        try:
            IndexBySet.objects.create(index=index, index_set=index_set)
        except ValidationError as e:
            errors.append(';'.join(e.messages))

    return index, errors, warnings

def get_or_create_index(index_name: str, index_structure: str, index_set: IndexSet = None, external_index_name: str = None):
    """
    Get or create an index model with the provided index_structure and set.
    If the index exists and a new index set is provided, it will link the index to the new index set.

    Args:
        `index_name`: Name of the index.
        `index_structure`: Name of the index structure.
        `index_set`: Optional Index set instance. Defaults to None.
        `external_index_name`: Optional External Index Name given by vendor. Defaults to None.

    Returns:
        Tuple including the created index instance, a flag to indicate if the index was created as well as a list of errors and warnings.
    """
    index = None
    created_entity = False
    errors = []
    warnings = []
    index_structure_obj = None

    if not index_name:
        errors.append(f"Index name is required.")
    if index_structure:
        try:
            index_structure_obj = IndexStructure.objects.get(name=index_structure)
        except IndexStructure.DoesNotExist:
            errors.append(f"Invalid index structure.")
    else:
        errors.append(f"Index structure is required.")

    if not errors:
        try:
            index = Index.objects.get(name=index_name)
            # Validate that the retrieved index is the right one
            if index_structure_obj is not None and index.index_structure != index_structure_obj:
                errors.append(f"Provided index_structure {index_structure} does not match the index structure {index.index_structure.name} of the index retrieved using the name {index_name}.")
        except Index.DoesNotExist:
            try:
                index_data = dict(
                    name=index_name,
                    index_structure=index_structure_obj,
                    # Optional attributes
                    **(dict(external_name=external_index_name) if external_index_name is not None else dict())
                )
                index = Index.objects.create(**index_data)
                created_entity = True
            except ValidationError as e:
                errors.append(';'.join(e.messages))

    if index is not None and not errors and index_set is not None:
        try:
            IndexBySet.objects.get_or_create(index=index, index_set=index_set)
        except ValidationError as e:
            errors.append(';'.join(e.messages))

    return index, created_entity, errors, warnings


def create_indices_3prime_by_sequence(index, index_3prime):
    indices_3prime_by_sequence = []
    errors = []
    warnings = []

    if not index:
        errors.append(f"Index is required.")
        return indices_3prime_by_sequence, errors, warnings

    for value in index_3prime:
        sequence = None
        try:
            sequence, _ = Sequence.objects.get_or_create(value=value)
        except Exception as e:
            errors.append(';'.join(e.messages))

        if sequence:
            try:
                indices_3prime_by_sequence.append(SequenceByIndex3Prime.objects.create(index=index, sequence=sequence))
            except ValidationError as e:
                errors.append(';'.join(e.messages))

    return (indices_3prime_by_sequence, errors, warnings)


def create_indices_5prime_by_sequence(index, index_5prime):
    indices_5prime_by_sequence = []
    errors = []
    warnings = []

    if not index:
        errors.append(f"Index is required.")
        return indices_5prime_by_sequence, errors, warnings

    for value in index_5prime:
        sequence = None
        try:
            sequence, _ = Sequence.objects.get_or_create(value=value)
        except Exception as e:
            errors.append(';'.join(e.messages))

        if sequence:
            try:
                indices_5prime_by_sequence.append(SequenceByIndex5Prime.objects.create(index=index, sequence=sequence))
            except ValidationError as e:
                errors.append(';'.join(e.messages))

    return (indices_5prime_by_sequence, errors, warnings)


def _reverse_complement(sequence):
    if not sequence:
        return ""
    else:
        reversed_sequence = sequence[::-1]
        return reversed_sequence.translate(reversed_sequence.maketrans("ATGCU", "TACGA"))


# Test each listed index against each other, given the instrument type reading sense and the length provided for each index part.
# If not provided (both 0) the length will be automatically calculated.
def validate_indices(indices, index_read_direction_5_prime=INDEX_READ_FORWARD, index_read_direction_3_prime=INDEX_READ_FORWARD, length_5_prime=0, length_3_prime=0, threshold=None):
    """
    Validate a set of index against each other to ensure they do not collide.

    Args:
        `indices`: List of index object to be tested
        `index_read_direction_5_prime`: Direction the 5 prime index is read in the sequencer. Default to INDEX_READ_FORWARD.
        `index_read_direction_3_prime`: Direction the 3 prime index is read in the sequencer. Default to INDEX_READ_FORWARD.
        `length_5_prime`: Length the algorithm tests each 5 prime index. Default to the calculated value for given indices.
        `length_3_prime`: Length the algorithm tests each 3 prime index. Default to the calculated value for given indices.
        `threshold`: Number of differences (distance) allowed before calling a collision. A threshold of 0 test if 2 indices are identical.

    Returns:
        Tuple with validation results, the errors and the warnings.
        results : `index_read_direction_5_prime`: Read direaction 5 prime.
                  `index_read_direction_3_prime`: Read direaction 3 prime.
                  `validation_length_is_calculated`: Flag indicating if the validation length was calculated or given.
                  `validation_length_5prime`: Length used for validation 5 prime indices.
                  `validation_length_3prime`: Length used for validation 3 prime indices.
                  `threshold`: Distance used to declare validity.
                  `header`: Header of the distance matrix (index ids)
                  `distances`: Matrix with distances between each indices.
                  `is_valid`: Boolean declaring validity using the given threshold. Not populated if no threshold provided.

    """
    results = {}
    errors = []
    warnings = []
    is_valid = True
    # Preload indices and make sure they all exist
    validation_length_is_calculated = not any([length_5_prime, length_3_prime])
    indices_dict = {}
    # Make sure all indices exist and build a dict with the instances
    for index in indices:
        indices_dict[index.id] = {"obj": index}

    if len(indices) == 0:
        warnings.append(("No indices were provided for validation.", []))
    else:
        # Calculate the length of the default indices.
        # first get the length of each partial index and flanker in a tuple list
        for index in indices:
            index_dict = indices_dict[index.id]
            # get flanker sequences
            if index_read_direction_5_prime == INDEX_READ_FORWARD:
                flanker_5_prime = index_dict["obj"].index_structure.flanker_5prime_forward.value
            else:
                flanker_5_prime = index_dict["obj"].index_structure.flanker_5prime_reverse.value
            if index_read_direction_3_prime == INDEX_READ_FORWARD:
                flanker_3_prime = index_dict["obj"].index_structure.flanker_3prime_forward.value
            else:
                flanker_3_prime = index_dict["obj"].index_structure.flanker_3prime_reverse.value

            min_5prime_index_length = 0
            max_5prime_index_length = STANDARD_SEQUENCE_FIELD_LENGTH * 2 # Assuming max size index and flanker
            index_dict["actual_5prime_sequences"] = []
            for sequence_5prime in (index_dict["obj"].list_5prime_sequences or [""]):
                if index_read_direction_5_prime == INDEX_READ_FORWARD:
                    actual_5prime_sequence = sequence_5prime + flanker_5_prime
                else:
                    actual_5prime_sequence = _reverse_complement(flanker_5_prime + sequence_5prime)
                index_dict["actual_5prime_sequences"].append(actual_5prime_sequence)
                min_5prime_index_length = max(min_5prime_index_length, len(sequence_5prime))
                max_5prime_index_length = min(max_5prime_index_length, len(actual_5prime_sequence))
            index_dict["min_index_5prime_length"] = min_5prime_index_length
            index_dict["max_index_5prime_length"] = max_5prime_index_length

            min_3prime_index_length = 0
            max_3prime_index_length = STANDARD_SEQUENCE_FIELD_LENGTH * 2 # Assuming max size index and flanker
            index_dict["actual_3prime_sequences"] = []
            for sequence_3prime in (index_dict["obj"].list_3prime_sequences or [""]):
                if index_read_direction_3_prime == INDEX_READ_FORWARD:
                    actual_3prime_sequence = sequence_3prime + flanker_3_prime
                else:
                    actual_3prime_sequence = _reverse_complement(flanker_3_prime + sequence_3prime)
                index_dict["actual_3prime_sequences"].append(actual_3prime_sequence)
                min_3prime_index_length = max(min_3prime_index_length, len(sequence_3prime))
                max_3prime_index_length = min(max_3prime_index_length, len(actual_3prime_sequence))
            index_dict["min_index_3prime_length"] = min_3prime_index_length
            index_dict["max_index_3prime_length"] = max_3prime_index_length
            
        # Min index length is used as comparison length
        # Max index length is used to validate some errors (include length of index + flanker in the read direction)
        # Parameter length supercede the calculated ones but a warning is sent if they do not match.

        # get target min and max length
        min_5prime_lengths = []
        max_5prime_lengths = []
        min_3prime_lengths = []
        max_3prime_lengths = []
        for index in indices:
            index_dict = indices_dict[index.id]
            min_5prime_lengths.append(index_dict["min_index_5prime_length"])
            max_5prime_lengths.append(index_dict["max_index_5prime_length"])
            min_3prime_lengths.append(index_dict["min_index_3prime_length"])
            max_3prime_lengths.append(index_dict["max_index_3prime_length"])
        target_min_5prime_length = max(min_5prime_lengths)
        target_max_5prime_length = min(max_5prime_lengths)
        target_min_3prime_length = max(min_3prime_lengths)
        target_max_3prime_length = min(max_3prime_lengths)

        # Check if both length are default value (0). This means we have to supply the length. Otherwise, validate the length given.
        if not validation_length_is_calculated and (length_5_prime != target_min_5prime_length or length_3_prime != target_min_3prime_length):
            warnings.append(("Calculated validation lengths (5 prime : {0}, 3 prime : {1}) are different than requested ones (5 prime : {2}, 3 prime : {3}).", [target_min_5prime_length, target_min_3prime_length, length_5_prime, length_3_prime]))
            target_min_5prime_length = length_5_prime
            target_min_3prime_length = length_3_prime

        # Warning if the minimal required index length for some indices is larger than the maximal permitted length for other indices
        # some indices do not support 5 prime index of this size (or at all).
        if target_min_5prime_length > target_max_5prime_length:
            # identify and list the problematic indices
            indices_in_warning = list(filter(lambda x: x[1] < target_min_5prime_length, zip(indices, max_5prime_lengths)))
            warnings.append(f"Indices in this list {[i.id for i, _ in indices_in_warning]} do not support 5 primes index of the required length ({target_min_5prime_length}).")
        # some indices do not support 3 prime index of this size (or at all).
        if target_min_3prime_length > target_max_3prime_length:
            # identify and list the problematic indices
            indices_in_warning = list(filter(lambda x: x[1] < target_min_3prime_length, zip(indices, max_3prime_lengths)))
            warnings.append(f"Indices in this list {[i.id for i, _ in indices_in_warning]} do not support 3 primes index of the required length ({target_min_3prime_length}).")

        # warning if the minimal required index length for some indices is larger than the requested index length : sub-optimal validation
        indices_in_warning = list(filter(lambda x: x[1] > target_min_5prime_length, zip(indices, min_5prime_lengths)))
        if indices_in_warning: # 5 prime
            warnings.append(("Sub-optimal. Indices in this list {0} validate using a length ({1}) that is smaller than their sequence length ({2}).", [[i.id for i, _ in indices_in_warning], target_min_5prime_length, [length for _, length in indices_in_warning]]))
        indices_in_warning = list(filter(lambda x: x[1] > target_min_3prime_length, zip(indices, min_3prime_lengths)))
        if indices_in_warning: # 3 prime
            warnings.append(("Sub-optimal. Indices in this list {0} validate using a length ({1}) that is smaller than their sequence length ({2}).", [[i.id for i, _ in indices_in_warning], target_min_3prime_length, [length for _, length in indices_in_warning]]))

        # warning if the minimal required index length for some indices is larger than the minimal required index length for other indices
        indices_in_warning = list(filter(lambda x: x[1] < target_min_5prime_length, zip(indices, min_5prime_lengths)))
        if indices_in_warning: # 5 prime
            warnings.append(("Indices in this list {0} have smaller 5 prime index length than the length used for validation ({1}).", [[i.id for i, _ in indices_in_warning], target_min_5prime_length]))
        indices_in_warning = list(filter(lambda x: x[1] < target_min_3prime_length, zip(indices, min_3prime_lengths)))
        if indices_in_warning: # 3 prime
            warnings.append(("Indices in this list {0} have smaller 3 prime index length than the length used for validation ({1}).", [[i.id for i, _ in indices_in_warning], target_min_3prime_length]))

        # At this point we have the validation data loaded, validation length calculated and validated.
        # We will now proceed to calculate the hamming distance of the index.
        if not errors:
            validation_length_5prime = target_min_5prime_length
            validation_length_3prime = target_min_3prime_length
            results["index_read_direction_5_prime"] = index_read_direction_5_prime
            results["index_read_direction_3_prime"] = index_read_direction_3_prime
            results["validation_length_is_calculated"] = validation_length_is_calculated
            results["validation_length_5prime"] = validation_length_5prime
            results["validation_length_3prime"] = validation_length_3prime
            results["threshold"] = threshold
            results["header"] = [i.id for i in indices]
            results["distances"] = [[None for i in indices] for j in indices]

            for reference_count, index_reference in enumerate(indices):
                index_dict_reference = indices_dict[index_reference.id]
                for validation_count, index_validation in enumerate(indices[reference_count + 1:], reference_count + 1): # skip redundant calculations
                    index_dict_validation = indices_dict[index_validation.id]
                    # 5 prime hamming
                    min_distance_5prime = 0
                    if validation_length_5prime: # if length 0 skip
                        min_distance_5prime = validation_length_5prime # Best case scenario
                        for index_5prime_reference in index_dict_reference["actual_5prime_sequences"]:
                            for index_5prime_validation in index_dict_validation["actual_5prime_sequences"]:
                                distance_5prime = sum(base_reference != base_validation for base_reference, base_validation in zip(index_5prime_reference[:validation_length_5prime], index_5prime_validation[:validation_length_5prime]))
                                min_distance_5prime = min(min_distance_5prime, distance_5prime)
                    # 3 prime hamming
                    min_distance_3prime = 0
                    if validation_length_3prime: # if length 0 skip
                        min_distance_3prime = validation_length_3prime # Best case scenario
                        for index_3prime_reference in index_dict_reference["actual_3prime_sequences"]:
                            for index_3prime_validation in index_dict_validation["actual_3prime_sequences"]:
                                distance_3prime = sum(base_reference != base_validation for base_reference, base_validation in zip(index_3prime_reference[:validation_length_3prime], index_3prime_validation[:validation_length_3prime]))
                                min_distance_3prime = min(min_distance_3prime, distance_3prime)
                    if threshold is not None:
                        is_valid = is_valid and (min_distance_3prime > threshold or min_distance_5prime > threshold)
                    results["distances"][validation_count][reference_count] = tuple([min_distance_3prime, min_distance_5prime])
    results["is_valid"] = is_valid and not errors if threshold is not None else None
    return (results, errors, warnings)

def validate_distance_matrix(distance_matrix, threshold: int):
    """
    Validate a matrix of distances generated by validate_indices in results["distances"] with a new threshold without regenerating the matrix.
    Each distance tuple in the matrix is validated against the threshold. If any of the 3 prime or 5 prime indices are above the threshold
    the distance is valid. The None in the matrix are skipped and ignored. If all distances are valid, the function return True. A list of
    tuple for distance who failed the test contains the order of the 2 indices to be at risk of collision for that threshold.

    Args:
        `distance_matrix`: 2D list of distance tuples generated by validate_indices.
        `threshold`: The highest number of errors tolerated between 2 indices to differentiate them.
                     A threshold of 0 signify any error in reading indices may trigger an association to the wrong index.

    Returns:
        A valid indicator boolean and a list of potential collision tuple 
    """
    is_valid = True
    list_collisions = []
    for i, distances_x in enumerate(distance_matrix):
        for j, distances_x_y in enumerate(distances_x):
            if distances_x_y is not None:
                distance_3_prime, distance_5_prime = distances_x_y
                valid_distance = distance_3_prime > threshold or distance_5_prime > threshold
                if not valid_distance:
                    list_collisions.append((i, j))
                is_valid = is_valid and valid_distance
    return is_valid, list_collisions
