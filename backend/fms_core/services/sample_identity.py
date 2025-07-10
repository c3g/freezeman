from fms_core.schema_validators import SAMPLE_IDENTITY_REPORT_VALIDATOR
from django.core.exceptions import ValidationError
from fms_core.models import Sample, Container, SampleIdentity
from fms_core.models._constants import SEX_UNKNOWN, SEX_MALE, SEX_FEMALE
from fms_core.containers import CONTAINER_KIND_SPECS
from fms_core.coordinates import convert_alpha_digit_coord_to_ordinal, COLUMN
from typing import TypedDict
from decimal import Decimal

class Identity_match_info(TypedDict):
    matching_site_ratio: Decimal
    compared_sites: int

def create_sample_identity(biosample_id: int, conclusive: bool, predicted_sex: str, matches_by_biosample_id: dict[int: Identity_match_info], replace: bool = False):
    """
    Create a sample identity with the provided information. If there is currently an existing sample identity, an error is returned unless
    one of two situation is present. If the existing sample identity passed attribute is false or if the replace paramater is true the content
    of the existing sample identity is replaced with the provided information.

    Args:
        `biosample_id`: Biosample ID for the sample identity.
        `conclusive`: Identity test success boolean.
        `predicted_sex`: Predicted sex of the measure.
        `matches_by_biosample_id`: Dictionary of identity match information to other biosamples.
        `replace`: Boolean that indicate if the current information is to replace an already conclusive identity. Defaults to false.

    Returns:
        Tuple with the following content:
        `sample_identity`: Sample identity object.
        `errors`: Errors generated during the processing.
        `warnings`: Warnings generated during the processing.
    """
    sample_identity = None
    errors = []
    warnings = []
    try:
        sample_identity, created = SampleIdentity.objects.get_or_create(biosample_id=biosample_id, defaults={"predicted_sex": predicted_sex, "conclusive": conclusive})
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    sorted_biosample_id_matches = matches_by_biosample_id.keys().sort()
    if sample_identity and not created:
        old_biosample_matches = [identity.biosample_id for identity in sample_identity.identity_matches].sort()
        if replace or (not replace and not sample_identity.conclusive):
            if not sample_identity.predicted_sex == predicted_sex:
                warnings.append(f"Identity change for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.predicted_sex} to {predicted_sex}.")
                sample_identity.predicted_sex = predicted_sex
            if not sample_identity.conclusive == conclusive:
                warnings.append(f"Identity change for biosample ID {biosample_id}. Conclusive identity changed from {sample_identity.conclusive} to {conclusive}.")
                sample_identity.conclusive = conclusive
            if not old_biosample_matches == sorted_biosample_id_matches:
                warnings.append(f"Identity change for biosample ID {biosample_id}. Identity biosample matches changed from {old_biosample_matches} to {sorted_biosample_id_matches}.")
                sample_identity.identity_matches.clear()
                for match in sorted_biosample_id_matches:
                    try:
                        matched_identity = SampleIdentity.objects.get(biosample_id=match)
                        sample_identity.identity_matches.add(matched_identity)
                    except Exception as err:
                        errors.append(f"Identity for biosample {match} cannot be found.")
            sample_identity.save()
        else: # not replace and sample_identity.conclusive
            warnings.append(f"Submitting new Identity for existing conclusive identity for biosample ID {biosample_id}.")
            if not sample_identity.predicted_sex == predicted_sex:
                errors.append(f"Identity difference for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.predicted_sex} to {predicted_sex}.")
            if not sample_identity.conclusive == conclusive:
                errors.append(f"Identity difference for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.conclusive} to {conclusive}.")
            if not old_biosample_matches == sorted_biosample_id_matches:
                errors.append(f"Identity difference for biosample ID {biosample_id}. Identity biosample matches changed from {old_biosample_matches} to {sorted_biosample_id_matches}.")
    elif sample_identity: # created
        for match in sorted_biosample_id_matches:
            try:
                matched_identity = SampleIdentity.objects.get(biosample_id=match)
                sample_identity.identity_matches.add(matched_identity)
            except Exception as err:
                errors.append(f"Identity for biosample {match} cannot be found.")
        sample_identity.save()
    
    return sample_identity, errors, warnings


def ingest_identity_testing_report(report_json, replace):
    """
    Ingest information from a json formated report submitted after testing the identity of a sample.
    The information provided is the predicted sex, and matches to previously tested samples.
    
    Args:
        `report_json`: Content of the report in a valid json format.
        `replace`: Enforces replacement of existing sample identities by newly submitted ones.

    Returns:
        Tuple with the following content:
        `identities`: Identities objects created or reused from the content of the report.
        `errors`: Errors generated during the processing.
        `warnings`: Warnings generated during the processing.
    """
    identities = {}
    errors = []
    warnings = []

    DICT_FMS_SEX = { None: None, "male": SEX_MALE, "female": SEX_FEMALE, "inconclusive": SEX_UNKNOWN }

    for error in SAMPLE_IDENTITY_REPORT_VALIDATOR.validator.iter_errors(report_json):
        path = "".join(f'["{p}"]' for p in error.path)
        msg = f"{path}: {error.message}" if error.path else error.message
        errors.append(msg)
    if errors:
        return (identities, errors, warnings)

    for sample_report in report_json["samples"].values():
        biosample_id = sample_report["biosample_id"]
        conclusive = sample_report["passed"]
        predicted_sex = None
        matches_by_biosample_id = {}
        if conclusive:
            predicted_sex = DICT_FMS_SEX(sample_report.get("fluidigm_predicted_sex", None))
            matches = sample_report.get("genotype_matches", {})
            matches_by_biosample_id = {match["biosample_id"]: {"matching_site_ratio": match["percent_match"]/100, "compared_sites": match["n_sites"]} for match in matches.values()}
        sample_identity, errors_creation, warnings_creation = create_sample_identity(biosample_id=biosample_id,
                                                                                     conclusive=conclusive,
                                                                                     predicted_sex=predicted_sex,
                                                                                     matches_by_biosample_id=matches_by_biosample_id,
                                                                                     replace=replace)
        errors.extend(errors_creation)
        warnings.extend(warnings_creation)
        if sample_identity and not errors_creation:
            identities[biosample_id] = sample_identity

    return (identities, errors, warnings)