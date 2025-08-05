from fms_core.schema_validators import SAMPLE_IDENTITY_REPORT_VALIDATOR
from django.core.exceptions import ValidationError
from fms_core.models import  SampleIdentity, SampleIdentityMatch
from fms_core.models._constants import SEX_UNKNOWN, SEX_MALE, SEX_FEMALE
from typing import TypedDict
from decimal import Decimal

class Identity_match_info(TypedDict):
    matching_site_ratio: Decimal
    compared_sites: int

def create_sample_identity(biosample_id: int, conclusive: bool, predicted_sex: str, replace: bool = False):
    """
    Create a sample identity with the provided information. If there is currently an existing sample identity, an error is returned unless
    one of two situation is present. If the existing sample identity passed attribute is false or if the replace paramater is true the content
    of the existing sample identity is replaced with the provided information.

    Args:
        `biosample_id`: Biosample ID for the sample identity.
        `conclusive`: Identity test success boolean.
        `predicted_sex`: Predicted sex of the measure.
        `replace`: Boolean that indicate if the current information is to replace an already conclusive identity. Defaults to false.

    Returns:
        Tuple with the following content:
        `sample_identity`: Sample identity object.
        `kept_existing`: Boolean indicating an existing identity was kept.
        `errors`: Errors generated during the processing.
        `warnings`: Warnings generated during the processing.
    """
    sample_identity = None
    kept_existing_identity = False
    errors = []
    warnings = []
    try:
        sample_identity, created = SampleIdentity.objects.get_or_create(biosample_id=biosample_id, defaults={"predicted_sex": predicted_sex, "conclusive": conclusive})
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    if sample_identity and not created:
        if replace or (not replace and not sample_identity.conclusive):
            if not sample_identity.predicted_sex == predicted_sex:
                warnings.append(f"Identity change for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.predicted_sex} to {predicted_sex}.")
                sample_identity.predicted_sex = predicted_sex
            if not sample_identity.conclusive == conclusive:
                warnings.append(f"Identity change for biosample ID {biosample_id}. Conclusive identity changed from {sample_identity.conclusive} to {conclusive}.")
                sample_identity.conclusive = conclusive
            sample_identity.identity_matches.clear()
            sample_identity.save()
        else: # not replace and sample_identity.conclusive
            kept_existing_identity = True
            warnings.append(f"Submitting new Identity for existing conclusive identity for biosample ID {biosample_id}.")
            if not sample_identity.predicted_sex == predicted_sex:
                errors.append(f"Identity difference for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.predicted_sex} to {predicted_sex}.")
            if not sample_identity.conclusive == conclusive:
                errors.append(f"Identity difference for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.conclusive} to {conclusive}.")
    
    return sample_identity, kept_existing_identity, errors, warnings

def create_sample_identity_matches(tested_identity: SampleIdentity, matches_by_biosample_id: dict[int, Identity_match_info]):
    """
    Create sample identity matches with the provided information.

    Args:
        `tested_identity`: Biosample ID for the sample identity.
        `matches_by_biosample_id`: Dictionary of identity match information to other biosamples.

    Returns:
        Tuple with the following content:
        `errors`: Errors generated during the processing.
        `warnings`: Warnings generated during the processing.
    """
    errors = []
    warnings = []
    for matched_biosample_id, match_info in matches_by_biosample_id.items():
        try:
            matched_identity = SampleIdentity.objects.get(biosample_id=matched_biosample_id)
            # Create the tested relation
            _, tested_created = SampleIdentityMatch.objects.get_or_create(tested=tested_identity,
                                                                          matched=matched_identity,
                                                                          matching_site_ratio=match_info["matching_site_ratio"],
                                                                          compared_sites=match_info["compared_sites"])
            # Create the reverse relation
            _, matched_created = SampleIdentityMatch.objects.get_or_create(tested=matched_identity,
                                                                           matched=tested_identity,
                                                                           matching_site_ratio=match_info["matching_site_ratio"],
                                                                           compared_sites=match_info["compared_sites"])
            if any([not tested_created, not matched_created]):
                warnings.append(f"Identity matches between identity {tested_identity.id} and {matched_identity.id} already exist.")
        except Exception as err:
            errors.append(err)
    
    return errors, warnings


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
    identity_by_biosample_id = {}
    identity_kept_by_biosample_id = {}
    errors = []
    warnings = []

    DICT_FMS_SEX = { None: None, "male": SEX_MALE, "female": SEX_FEMALE, "inconclusive": SEX_UNKNOWN }

    for error in SAMPLE_IDENTITY_REPORT_VALIDATOR.validator.iter_errors(report_json):
        path = "".join(f'["{p}"]' for p in error.path)
        msg = f"{path}: {error.message}" if error.path else error.message
        errors.append(msg)
    if errors:
        return (identity_by_biosample_id, errors, warnings)

    # Create identities
    for sample_report in report_json["samples"].values():
        biosample_id = int(sample_report["biosample_id"])
        conclusive = sample_report["passed"]
        predicted_sex = DICT_FMS_SEX[sample_report.get("fluidigm_predicted_sex", None)]
        sample_identity, identity_kept, errors_creation, warnings_creation = create_sample_identity(biosample_id=biosample_id,
                                                                                                    conclusive=conclusive,
                                                                                                    predicted_sex=predicted_sex,
                                                                                                    replace=replace)
        errors.extend(errors_creation)
        warnings.extend(warnings_creation)
        if sample_identity and not errors_creation:
            identity_by_biosample_id[biosample_id] = sample_identity
            identity_kept_by_biosample_id[biosample_id] = identity_kept
    
    # add identity matches
    for sample_report in report_json["samples"].values():
        biosample_id = int(sample_report["biosample_id"])
        tested_identity = identity_by_biosample_id.get(biosample_id, None)
        identity_kept = identity_kept_by_biosample_id.get(biosample_id, False)
        matches_by_biosample_id = {}
        if tested_identity is not None and not identity_kept:
            matches = sample_report.get("genotype_matches", None)
            if matches is not None:
                matches_by_biosample_id = {int(match["biosample_id"]): {"matching_site_ratio": (Decimal(str(match["percent_match"]))/100).quantize(Decimal("0.00001")), "compared_sites": match["n_sites"]} for match in matches.values()}
                errors_matches, warnings_matches = create_sample_identity_matches(tested_identity=tested_identity, matches_by_biosample_id=matches_by_biosample_id)
                errors.extend(errors_matches)
                warnings.extend(warnings_matches)
    return (identity_by_biosample_id, errors, warnings)