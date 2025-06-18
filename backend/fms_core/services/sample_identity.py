from fms_core.schema_validators import SAMPLE_IDENTITY_REPORT_VALIDATOR
from django.core.exceptions import ValidationError
from fms_core.models import Sample, Container, SampleIdentity
from fms_core.models._constants import SEX_UNKNOWN
from fms_core.containers import CONTAINER_KIND_SPECS
from fms_core.coordinates import convert_alpha_digit_coord_to_ordinal, COLUMN

def create_sample_identity(biosample_id: int, conclusive: bool, predicted_sex: str, biosample_id_matches: list[int], replace: bool = False):
    """
    Create a sample identity with the provided information. If there is currently an existing sample identity, an error is returned unless
    one of two situation is present. If the existing sample identity passed attribute is false or if the replace paramater is true the content
    of the existing sample identity is replaced with the provided information.

    Args:
        `biosample_id`: Biosample ID for the sample identity.
        `conclusive`: Identity test success boolean.
        `predicted_sex`: Predicted sex of the measure.
        `biosample_matches`: Other biosamples that matches the current identity.

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

    sorted_biosample_id_matches = biosample_id_matches.sort()
    if sample_identity and not created:
        old_biosample_matches = [identity.biosample_id for identity in sample_identity.identity_matches].sort()
        if replace or (not replace and not sample_identity.conclusive):
            if not sample_identity.predicted_sex == predicted_sex:
                warnings.append(f"Identity change for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.predicted_sex} to {predicted_sex}.")
                sample_identity.predicted_sex = predicted_sex
            if not sample_identity.conclusive == conclusive:
                warnings.append(f"Identity change for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.conclusive} to {conclusive}.")
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

    INCONCLUSIVE = "inconclusive"

    for error in SAMPLE_IDENTITY_REPORT_VALIDATOR.validator.iter_errors(report_json):
        path = "".join(f'["{p}"]' for p in error.path)
        msg = f"{path}: {error.message}" if error.path else error.message
        errors.append(msg)
    if errors:
        return (identities, errors, warnings)

    sample_by_coordinate = {}
    coordinate_spec = None
    container_barcode = report_json["barcode"]
    if container_barcode is not None:
        try:
            container = Container.objects.get(container__barcode=container_barcode)
            coordinate_spec = CONTAINER_KIND_SPECS[container.kind].coordinate_spec
        except Container.DoesNotExist as err:
            errors.append(f"Container with barcode {container_barcode} does not exist.")
        samples_tested = Sample.objects.filter(container__barcode=container_barcode)
        if not samples_tested.exists():
            errors.append(f"Provided container barcode do not have any samples. Make sure Identity QC template was submitted.")
        else:
            sample_by_coordinate = {str(convert_alpha_digit_coord_to_ordinal(sample.coordinates, coordinate_spec, COLUMN)): sample for sample in samples_tested}
        for sample_report in report_json["samples"].values():
            sample = sample_by_coordinate[sample_report["sample_position"]]
            conclusive = sample_report["passed"]
            predicted_sex = None
            matches = []
            if conclusive:
                predicted_sex = sample_report.get("fluidigm_predicted_sex", None)
                if predicted_sex == INCONCLUSIVE:
                    predicted_sex = SEX_UNKNOWN
                matches = sample_report.get("genotype_match", [])
            biosample_id=sample.biosample_not_pool
            sample_identity, errors_creation, warnings_creation = create_sample_identity(biosample_id=biosample_id, conclusive=conclusive, predicted_sex=predicted_sex, biosample_id_matches=matches, replace=replace)
            errors.extend(errors_creation)
            warnings.extend(warnings_creation)
            if sample_identity and not errors_creation:
                identities[biosample_id] = sample_identity      
    else:
        errors.append("Identity testing container barcode is missing.")

    return (identities, errors, warnings)