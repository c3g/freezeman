from fms_core.models import Index, IndexSet, IndexStructure, Sequence, SequenceByIndex3Prime, SequenceByIndex5Prime, InstrumentType
from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE, STANDARD_SEQUENCE_FIELD_LENGTH
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
            except ValidationError as e:
                errors.append(';'.join(e.messages))

    return index_set, created_entity, errors, warnings


def create_index(index_name, index_structure, index_set=None):
    index = None
    errors = []
    warnings = []

    index_structure_obj = None
    if index_structure:
        try:
            index_structure_obj = IndexStructure.objects.get(name=index_structure)
        except IndexStructure.DoesNotExist:
            errors.append(f"Invalid index structure.")

        try:
            index = Index.objects.create(index_set=index_set, name=index_name, index_structure=index_structure_obj)
        except ValidationError as e:
            errors.append(';'.join(e.messages))

    else:
        errors.append(f"Index structure is needed to create an index.")

    return index, errors, warnings


def create_indices_3prime_by_sequence(index, index_3prime):
    indices_3prime_by_sequence = None
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

    for value in index_5prime:
        sequence = None
        try:
            sequence, _ = Sequence.objects.get_or_create(value=value)
        except Exception as e:
            errors.append(';'.join(e.messages))

        if sequence:
            try:
                indices_5prime_by_sequence = SequenceByIndex5Prime.objects.create(index=index, sequence=sequence)
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
def validate_indices(indices_ids, instrument_type_id, length_5_prime=0, length_3_prime=0, threshold=None):
    results = {}
    errors = []
    warnings = []
    is_valid = True
    # Preload indices and make sure they all exist
    validation_length_is_calculated = not any([length_5_prime, length_3_prime])
    index_dict = {}
    # Make sure all indices exist and build a dict with the instances
    for index_id in indices_ids:
        try:
            index_dict[index_id] = {"obj": Index.objects.get(id=index_id)}
        except Index.DoesNotExist:
            errors.append(f"Index with id {index_id} does not exist.")
    if not errors:
        # Get read direction from the instrument type (raise error if instrument type do not exist)
        try:
            instrument_type = InstrumentType.objects.get(id=instrument_type_id)
        except InstrumentType.DoesNotExist:
            errors.append(f"Instrument type with id {instrument_type_id} does not exist.")
        if not errors:
            index_read_direction_5_prime = instrument_type.index_read_5_prime
            index_read_direction_3_prime = instrument_type.index_read_3_prime
    
            # Calculate the length of the default indices.
            # first get the length of each partial index and flanker in a tuple list
            for index_id in indices_ids:
                index = index_dict[index_id]
                # get flanker sequences
                if index_read_direction_5_prime == INDEX_READ_FORWARD:
                    flanker_5_prime = index["obj"].index_structure.flanker_5prime_forward.value
                else:
                    flanker_5_prime = index["obj"].index_structure.flanker_5prime_reverse.value
                if index_read_direction_3_prime == INDEX_READ_FORWARD:
                    flanker_3_prime = index["obj"].index_structure.flanker_3prime_forward.value
                else:
                    flanker_3_prime = index["obj"].index_structure.flanker_3prime_reverse.value

                min_5prime_index_length = 0
                max_5prime_index_length = STANDARD_SEQUENCE_FIELD_LENGTH * 2 # Assuming max size index and flanker
                index["actual_5prime_sequences"] = []
                for sequence_5prime in index["obj"].list_5prime_sequences:
                    if index_read_direction_5_prime == INDEX_READ_FORWARD:
                        actual_5prime_sequence = sequence_5prime + flanker_5_prime
                    else:
                        actual_5prime_sequence = _reverse_complement(flanker_5_prime + sequence_5prime)
                    index["actual_5prime_sequences"].append(actual_5prime_sequence)
                    min_5prime_index_length = max(min_5prime_index_length, len(sequence_5prime))
                    max_5prime_index_length = min(max_5prime_index_length, len(actual_5prime_sequence))
                index["min_index_5prime_length"] = min_5prime_index_length
                index["max_index_5prime_length"] = max_5prime_index_length

                min_3prime_index_length = 0
                max_3prime_index_length = STANDARD_SEQUENCE_FIELD_LENGTH * 2 # Assuming max size index and flanker
                index["actual_3prime_sequences"] = []
                for sequence_3prime in index["obj"].list_3prime_sequences():                        
                    if index_read_direction_3_prime == INDEX_READ_FORWARD:
                        actual_3prime_sequence = sequence_3prime + flanker_3_prime
                    else:
                        actual_3prime_sequence = _reverse_complement(flanker_3_prime + sequence_3prime)
                    index["actual_3prime_sequences"].append(actual_3prime_sequence)
                    min_3prime_index_length = max(min_3prime_index_length, len(sequence_3prime))
                    max_3prime_index_length = min(max_3prime_index_length, len(actual_3prime_sequence))
                    index["min_index_3prime_length"] = min_3prime_index_length
                    index["max_index_3prime_length"] = max_3prime_index_length
            
            # Min index length is used as comparison length
            # Max index length is used to validate some errors (include length of index + flanker in the read direction)
            # Parameter length supercede the calculated ones but a warning is sent if they do not match.

            # get target min and max length
            min_5prime_lengths = []
            max_5prime_lengths = []
            min_3prime_lengths = []
            max_3prime_lengths = []
            for index_id in indices_ids:
                index = index_dict[index_id]
                min_5prime_lengths.append(index["min_index_5prime_length"])
                max_5prime_lengths.append(index["max_index_5prime_length"])
                min_3prime_lengths.append(index["min_index_3prime_length"])
                max_3prime_lengths.append(index["max_index_3prime_length"])
            target_min_5prime_length = max(min_5prime_lengths)
            target_max_5prime_length = min(max_5prime_lengths)
            target_min_3prime_length = max(min_3prime_lengths)
            target_max_3prime_length = min(max_3prime_lengths)

            # Check if both length are default value (0). This means we have to supply the length. Otherwise, validate the length given.
            if not validation_length_is_calculated and (length_5_prime != target_min_5prime_length or length_3_prime != target_min_3prime_length):
                warnings.append(f"Calculated validation lengths (5 prime : {target_min_5prime_length}, 3 prime : {target_min_3prime_length}) are different than requested ones (5 prime : {length_5_prime}, 3 prime : {length_3_prime}).")
                target_min_5prime_length = length_5_prime
                target_min_3prime_length = length_3_prime
            
            # Error if the minimal required index length for some indices is larger than the maximal permitted length for other indices
            indices_in_error = []
            # some indices do not support 5 prime index of this size (or at all).
            if target_min_5prime_length > target_max_5prime_length:
                # identify and list the problematic indices
                indices_in_error = list(filter(lambda x: x[1] < target_min_5prime_length, zip(indices_ids, max_5prime_lengths)))
                errors.append(f"Indices in this list {[indice for indice, _ in indices_in_error]} do not support 5 primes index of the required length ({target_min_5prime_length}).")
            # some indices do not support 3 prime index of this size (or at all).
            indices_in_error = []
            if target_min_3prime_length > target_max_3prime_length:
                # identify and list the problematic indices
                indices_in_error = list(filter(lambda x: x[1] < target_min_3prime_length, zip(indices_ids, max_3prime_lengths)))
                errors.append(f"Indices in this list {[indice for indice, _ in indices_in_error]} do not support 3 primes index of the required length ({target_min_3prime_length}).")
            
            # warning if the minimal required index length for some indices is larger than the requested index length : sub-optimal validation
            indices_in_warning = list(filter(lambda x: x[1] > target_min_5prime_length, zip(indices_ids, min_5prime_lengths)))
            if indices_in_warning: # 5 prime
                warnings.append(f"Sub-optimal. Indices in this list {[indice for indice, _ in indices_in_warning]} validate using a length ({target_min_5prime_length}) that is smaller than their sequence length ({[length for _, length in indices_in_warning]}).")
            indices_in_warning = list(filter(lambda x: x[1] > target_min_3prime_length, zip(indices_ids, min_3prime_lengths)))
            if indices_in_warning: # 3 prime
                warnings.append(f"Sub-optimal. Indices in this list {[indice for indice, _ in indices_in_warning]} validate using a length ({target_min_3prime_length}) that is smaller than their sequence length ({[length for _, length in indices_in_warning]}).")

            # warning if the minimal required index length for some indices is larger than the minimal required index length for other indices
            indices_in_warning = list(filter(lambda x: x[1] < target_min_5prime_length, zip(indices_ids, min_5prime_lengths)))
            if indices_in_warning: # 5 prime
                warnings.append(f"Indices in this list {[indice for indice, _ in indices_in_warning]} have smaller 5 prime index length than the length used for validation ({target_min_5prime_length}).")
            indices_in_warning = list(filter(lambda x: x[1] < target_min_3prime_length, zip(indices_ids, min_3prime_lengths)))
            if indices_in_warning: # 3 prime
                warnings.append(f"Indices in this list {[indice for indice, _ in indices_in_warning]} have smaller 3 prime index length than the length used for validation ({target_min_3prime_length}).")

            # At this point we have the validation data loaded, validation length calculated and validated.
            # We will now proceed to calculate the hamming distance of the index.
            if not errors:
                validation_length_5prime = target_min_5prime_length
                validation_length_3prime = target_min_3prime_length
                results["instrument_type"] = instrument_type.type
                results["validation_length_is_calculated"] = validation_length_is_calculated
                results["validation_length_5prime"] = validation_length_5prime
                results["validation_length_3prime"] = validation_length_3prime
                results["threshold"] = threshold
                results["header"] = indices_ids
                results["distances"] = [[None for i in indices_ids] for j in indices_ids]               

                for reference_count, id_reference in enumerate(indices_ids):
                    index_reference = index_dict[id_reference]
                    for validation_count, id_validation in enumerate(indices_ids[reference_count + 1:], reference_count + 1): # skip redundant calculations
                        index_validation = index_dict[id_validation]
                        # 5 prime hamming
                        min_distance_5prime = 0
                        if validation_length_5prime: # if length 0 skip
                            min_distance_5prime = validation_length_5prime # Best case scenario
                            for index_5prime_reference in index_reference["actual_5prime_sequences"]:
                                for index_5prime_validation in index_validation["actual_5prime_sequences"]:
                                    distance_5prime = sum(base_reference != base_validation for base_reference, base_validation in zip(index_5prime_reference[:validation_length_5prime], index_5prime_validation[:validation_length_5prime]))
                                    min_distance_5prime = min(min_distance_5prime, distance_5prime)
                        # 3 prime hamming
                        min_distance_3prime = 0
                        if validation_length_3prime: # if length 0 skip
                            min_distance_3prime = validation_length_3prime # Best case scenario
                            for index_3prime_reference in index_reference["actual_3prime_sequences"]:
                                for index_3prime_validation in index_validation["actual_3prime_sequences"]:
                                    distance_3prime = sum(base_reference != base_validation for base_reference, base_validation in zip(index_3prime_reference[:validation_length_3prime], index_3prime_validation[:validation_length_3prime]))
                                    min_distance_3prime = min(min_distance_3prime, distance_3prime)
                        if threshold is not None:
                            is_valid = is_valid and (min_distance_3prime > threshold or min_distance_5prime > threshold)
                        results["distances"][reference_count][validation_count] = tuple([min_distance_3prime, min_distance_5prime])
    results["is_valid"] = is_valid if threshold is not None else None
    return (results, errors, warnings)
