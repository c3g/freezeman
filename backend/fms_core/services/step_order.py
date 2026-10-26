from collections import defaultdict
from django.db.models import Q

from fms_core.models import StepOrder, Sample
from fms_core.models._constants import SampleType

def valid_step_orders_for_study_queueing(candidate_sample_ids: list[int], tested_step_order_ids: list[int]) -> tuple[list[int], list[str], list[str]]:
    """
    Given the candidate samples intended for queueing to a study workflow, this function validate the tested step orders and provide a valid list.
    The service matches the candidate samples status to the expected sample type of the step orders' step.
    In order to validate a study workflow, provide all study workflow step orders as a list.

    Args:
            `candidate_sample_ids`: List of sample ids to validate against the given list of step orders.
            `tested_step_order_ids`: List of step orders id that need to be validated.
    
        Returns:
            The valid step order ids list or None if errors were encountered. Errors and warnings.
    """
    valid_step_order_ids = set()
    errors = []
    warnings = []

    step_orders_ids_by_sample_type = defaultdict(list)
    
    try:
        tested_step_orders = StepOrder.objects.filter(id__in=tested_step_order_ids).select_related("step").all()
        for step_order in tested_step_orders:
            step_orders_ids_by_sample_type[step_order.step.expected_sample_type] = step_orders_ids_by_sample_type[step_order.step.expected_sample_type].add(step_order.id)

        for sample_type, step_order_ids in step_orders_ids_by_sample_type.items():
            is_valid_sample_kind = False

            if sample_type == SampleType.ANY:
                is_valid_sample_kind = True
            elif sample_type == SampleType.UNEXTRACTED_SAMPLE:
                is_valid_sample_kind = not Sample.objects.filter(Q(id__in=candidate_sample_ids) & Q(derived_samples__sample_kind__is_extracted=True)).exists()
            elif sample_type == SampleType.EXTRACTED_SAMPLE:
                is_valid_sample_kind = not Sample.objects.filter(Q(id__in=candidate_sample_ids) & (Q(derived_samples__sample_kind__is_extracted=False) | Q(derived_samples__library__isnull=False))).exists()
            elif sample_type == SampleType.EXTRACTED_SAMPLE_OR_LIBRARY:
                is_valid_sample_kind = not Sample.objects.filter(Q(id__in=candidate_sample_ids) & Q(derived_samples__sample_kind__is_extracted=False)).exists()
            elif sample_type == SampleType.SAMPLE:
                is_valid_sample_kind = not Sample.objects.filter(Q(id__in=candidate_sample_ids) & Q(derived_samples__library__isnull=False)).exists()
            elif sample_type == SampleType.LIBRARY:
                is_valid_sample_kind = not Sample.objects.filter(Q(id__in=candidate_sample_ids) & Q(derived_samples__library__isnull=True)).exists()
            elif sample_type == SampleType.POOLED_LIBRARY:
                is_valid_sample_kind = not Sample.objects.filter(Q(id__in=candidate_sample_ids) & (Q(derived_samples__library__isnull=True) | Q(derived_by_sample__volume_ratio__gte=1))).exists()
            else:
                is_valid_sample_kind = False

            if is_valid_sample_kind:
                valid_step_order_ids.update(step_order_ids)
    
    except Exception as err:
        errors.append(str(err))
        return None, errors, warnings

    return list(valid_step_order_ids), errors, warnings