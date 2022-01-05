from django.apps import apps
import reversion
import json
import logging
from reversion.models import Version
from fms_core.models import *
from django.core.exceptions import ObjectDoesNotExist

# Parameters required for this curation
ACTION = "action"                               # = rollback_and_apply_extraction
CURATION_INDEX = "curation_index"               # Number indicating the order in which this action was performed during the curation.
COMMENT = "comment"                             # A comment to be stored in the logs. Optional.
WRONG_SOURCE_SAMPLE = "wrong_source_sample"     # The incorrect sample the extraction was applied to.
CORRECT_SOURCE_SAMPLE = "correct_source_sample" # The actual sample the extraction was supposed to be applied to.
EXTRACTED_SAMPLE = "extracted_sample"           # The resulting sample after the extraction.
VOLUME_USED = "volume_used"                     # Volume used in the extraction
USER_ID = "requester_user_id"                   # The user id of the person requesting the curation. Optional. If left empty, uses biobankadmin id.

'''
# Curation params template
{
  "CURATION_INDEX":1,
  "ACTION":"rollback_and_apply_extraction",
  "COMMENT":"User requested to rollback an extraction made on a wrong sample and apply it to the correct sample. Helpspot 26423.",
  "WRONG_SOURCE_SAMPLE":531155,
  "EXTRACTED_SAMPLE":534186,
  "CORRECT_SOURCE_SAMPLE":531150,
  "VOLUME_USED":200,
  "REQUESTER_USER_ID":6
}
'''

def rollback_and_apply_extraction(params, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Rollback Extraction started.")
    log.info("Comment [" + str(params.get(COMMENT, "None")) + "].")
    log.info("Extracted Sample : " + str(params[EXTRACTED_SAMPLE]))
    log.info("Wrong Source Sample : " + str(params.get(WRONG_SOURCE_SAMPLE)))
    log.info("Correct Source Sample : " + str(params[CORRECT_SOURCE_SAMPLE]))
    log.info("Volume Used : " + str(params[VOLUME_USED]))
    log.info("Requester id : " + str(params.get(USER_ID)))

    # initialize the curation
    curation_code = params.get(CURATION_INDEX, "Invalid index")
    error_found = False
    extracted_sample_id = params.get(EXTRACTED_SAMPLE)
    wrong_source_sample_id = params.get(WRONG_SOURCE_SAMPLE)
    correct_source_sample_id = params.get(CORRECT_SOURCE_SAMPLE)
    volume_used = params.get(VOLUME_USED)
    user_id = params.get(USER_ID)

    try:
        # retrieve pertinent models
        sample_model = apps.get_model("fms_core", "Sample")
        sample_lineage_model = apps.get_model("fms_core", "SampleLineage")
        sample_by_project = apps.get_model("fms_core", "SampleByProject")
        try:
            # Get sample objects
            extracted_sample = sample_model.objects.get(extracted_sample_id)
            wrong_source_sample = sample_model.objects.get(wrong_source_sample_id)
            correct_source_sample = sample_model.objects.get(correct_source_sample_id)

            # Assumption: There's only 1 derived sample and project associated to the source sample
            # TODO: loop through all the derived samples of the wrong source sample
            derived_sample_to_modify = extracted_sample.derived_samples.first()
            correct_derived_sample = correct_source_sample.derived_samples.first()
            wrong_sample_project = wrong_source_sample.projects.first()
            correct_sample_project = correct_source_sample.projects.first()

            # update fields
            extracted_sample.name = correct_source_sample.name
            extracted_sample.save(requester_id=user_id)
            derived_sample_to_modify.biosample = correct_derived_sample.biosample
            derived_sample_to_modify.experimental_group = correct_derived_sample.experimental_group
            derived_sample_to_modify.tissue_source = correct_derived_sample.tissue_source
            # TODO: qc flags???
            derived_sample_to_modify.save(requester_id=user_id)

            # rollback volume used in wrong source sample
            # TODO: uncomment this for future curations since Ariane did it manually
            # wrong_source_sample.volume = wrong_source_sample.volume + volume_used

            # update volume in the correct source sample
            correct_source_sample.volume = correct_source_sample.volume - volume_used
            correct_source_sample.save(requester_id=user_id)

            # update sample lineage parent id to the correct source sample
            lineage_link = sample_lineage_model.objects.get(parent_id=wrong_source_sample, child_id=extracted_sample_id)
            lineage_link.parent_id = correct_source_sample
            lineage_link.save(requester_id=user_id)

            # TODO: Handle case where correct sample/wrong sample is linked to more than one project
            # update project link to the correct source samples project
            sample_by_project_link = sample_by_project.objects.get(sample=extracted_sample, project=wrong_sample_project)
            sample_by_project_link.project = correct_sample_project
            sample_by_project_link.save(requester_id=user_id)

        except ObjectDoesNotExist:
            log.error(f"Object Does Not Exist")
            error_found = True

    except LookupError as e:
        log.error(e)
        error_found = True
    if not error_found:
        curation_code = None
        log.info(f"Extraction rollback and applied succesfully")
    return curation_code
