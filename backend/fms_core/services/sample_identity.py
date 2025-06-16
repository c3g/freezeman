from fms_core.schema_validators import SAMPLE_IDENTITY_REPORT_VALIDATOR
from django.core.exceptions import ValidationError
from fms_core.models import Sample, Container, SampleIdentity
from fms_core.models._constants import SEX_UNKNOWN
from fms_core.containers import CONTAINER_KIND_SPECS
from fms_core.coordinates import convert_alpha_digit_coord_to_ordinal, COLUMN

def get_or_create_sample_identity(biosample_id: int, passed: bool, predicted_sex: str, biosample_id_matches: list[int], replace: bool = False):
    """
    Returns a sample identity that is either existing or created from the provided informations.

    Args:
        biosample_id: Biosample ID for the sample identity.
        predicted_sex: Predicted sex of the measure.
        biosample_matches: Other biosamples that matches the current identity.

    Returns:
        Tuple with the following content:
        `sample_identity`: Sample identity object.
        `created`: Boolean that is true if the object was created.
        `errors`: Errors generated during the processing.
        `warnings`: Warnings generated during the processing.
    """
    sample_identity = None
    errors = []
    warnings = []
    try:
        sample_identity, created = SampleIdentity.objects.get_or_create(biosample_id=biosample_id, defaults={"predicted_sex": predicted_sex, "passed_qc": passed})
    except ValidationError as e:
        errors.append(';'.join(e.messages))

    if sample_identity and not created:
        old_biosample_matches = [identity.biosample_id for identity in sample_identity.identity_matches].sort()
        if replace:
            if not sample_identity.predicted_sex == predicted_sex:
                warnings.append(f"Identity change for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.predicted_sex} to {predicted_sex}.")
                sample_identity.predicted_sex = predicted_sex
            if not sample_identity.passed_qc == passed:
                warnings.append(f"Identity change for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.passed_qc} to {passed}.")
                sample_identity.passed_qc = passed
            if not old_biosample_matches == biosample_id_matches.sort():
                warnings.append(f"Identity change for biosample ID {biosample_id}. Identity biosample matches changed from {old_biosample_matches} to {biosample_id_matches.sort()}.")
                sample_identity.identity_matches.clear()
                for match in biosample_id_matches:
                    try:
                        matched_identity = SampleIdentity.objects.get(biosample_id=match)
                        sample_identity.identity_matches.add(matched_identity)
                    except Exception as err:
                        errors.append(f"Identity for biosample {match} cannot be found.")
        elif not replace:
            if not sample_identity.predicted_sex == predicted_sex:
                errors.append(f"Identity difference for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.predicted_sex} to {predicted_sex}.")
            if not sample_identity.passed_qc == passed:
                errors.append(f"Identity difference for biosample ID {biosample_id}. Predicted sex changed from {sample_identity.passed_qc} to {passed}.")
        
    return sample_identity, created, errors, warnings


def ingest_identity_testing_report(report_json):
    """
    Ingest information from a json formated report submitted after testing the identity of a sample.
    The information provided is the predicted sex, and matches to previously tested samples.
    
    Args:
        `report_json`: Content of the report in a valid json format.

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
            passed = sample_report["passed"]
            predicted_sex = None
            matches = []
            if passed:
                predicted_sex = sample_report.get("fluidigm_predicted_sex", None)
                if predicted_sex == INCONCLUSIVE:
                    predicted_sex = SEX_UNKNOWN
                matches = sample_report.get("genotype_match", [])
                
            
            SampleIdentity.objects.create(biosample=sample.biosample_not_pool, predicted_sex=predicted_sex)
                                          
    else:
        errors.append("Identity testing container barcode is missing.")

    return (identities, errors, warnings)