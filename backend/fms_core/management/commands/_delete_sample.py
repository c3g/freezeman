from django.apps import apps
import reversion
import json
import logging
from reversion.models import Version
from fms_core.models import Sample
from fms_core.services.sample import can_remove_sample

# Parameters required for this curation
ACTION = "action"                         # = delete_sample
CURATION_INDEX = "curation_index"         # Number indicating the order in which this action was performed during the curation.
COMMENT = "comment"                       # An optional comment to be stored in the logs
SAMPLE_IDENTIFIERS = "sample_identifiers" # An array of sample identifier dictionaries that uniquely identify samples.
USER_ID = "requester_user_id"             # The user id of the person requesting the curation. Optional. If left empty, uses biobankadmin id.

# Curation params template
# { CURATION_INDEX: 1,
#   ACTION: "delete_sample",
#   COMMENT: "Dr. No asked to delete these samples that are not used.",
#   SAMPLE_IDENTIFIERS: [{"id": 10231}, {"container__barcode": "PlateDeJunk", "coordinate__name"}], # List of sample identifiers dict
#   USER_ID: 5
# }

# This curation deletes only samples that are not child or parent to other samples.
# Samples must also not have been processed (no process_measurement).
# Remove all related objects that are tied uniquely to that specific sample.

# function that checks the references to a container and list them.
def list_references_to(sample):
    links = []
    child_of = list(sample.child_of.all())
    if child_of:
        links.append(f"Child of sample id {[parent.id for parent in child_of]}.")
    parent_of = list(sample.parent_of.all())
    if parent_of:
        links.append(f"Parent of sample id {[child.id for child in parent_of]}.")
    process_measurements = list(sample.process_measurement.all())
    if process_measurements:
        links.append(f"Processed using protocol {[process_measurement.process.protocol.name for process_measurement in process_measurements]}")
    return links

# Helper function that flags an entity for deletion and append the itself to the deletion list.
def set_entity_for_deletion(entity, requester_id, deletion_list, log):
    log.info(f"Flagging {entity.__class__.__name__} id [{entity.id} for deletion]")
    entity.delete = True
    entity.save(requester_id=requester_id) # save using the id of the requester (using the default admin user if None)
    deletion_list.append(entity) # Delay deletion until after the revision block so the object get a version

def delete_sample(params, objects_to_delete, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Delete Sample started.")
    log.info("Comment [" + str(params.get(COMMENT, "None")) + "].")
    log.info("Sample identifiers : " + str(params[SAMPLE_IDENTIFIERS]) + ".")
    log.info("Requester id : " + str(params.get(USER_ID)))

    # initialize the curation
    curation_code = params.get(CURATION_INDEX, "Invalid index")
    error_found = False
    identifiers_array = params[SAMPLE_IDENTIFIERS]
    user_id = params.get(USER_ID)

    try:
        sample_model = apps.get_model("fms_core", "Sample")
        count_deleted = 0
        for identifier in identifiers_array:
            try:
                sample = sample_model.objects.get(**identifier)
                is_removable, _, _ = can_remove_sample(sample)
                if not is_removable:
                    links = list_references_to(sample)
                    log.error(f"Sample [{str(identifier)}] is still referenced. {links}")
                    error_found = True
                else:
                    log.info(f"Deleted [Sample] name [{sample.name}] id [{sample.id}]].")
                    # start flagging for deletion object starting by leaves.
                    sample_next_steps = sample.sample_next_steps.all()
                    for sample_next_step in sample_next_steps:
                        sample_next_step_by_studies = sample_next_step.sample_next_step_by_study.all()
                        for sample_next_step_by_study in sample_next_step_by_studies:
                            set_entity_for_deletion(sample_next_step_by_study, user_id, objects_to_delete, log) # sample_next_step_by_study
                        set_entity_for_deletion(sample_next_step, user_id, objects_to_delete, log)              # sample_next_step
                    derived_samples = sample.derived_samples.all()
                    for derived_sample in derived_samples:
                        library = derived_sample.library
                        if library is not None:
                            set_entity_for_deletion(library, user_id, objects_to_delete, log)                   # library
                        biosample = derived_sample.biosample
                        metadata = biosample.metadata.all()
                        for metadatum in metadata:
                            set_entity_for_deletion(metadatum, user_id, objects_to_delete, log)                 # sample_metadata
                        set_entity_for_deletion(biosample, user_id, objects_to_delete, log)                     # biosample
                        derived_by_samples = derived_sample.derived_by_samples.all()
                        for derived_by_sample in derived_by_samples:
                            set_entity_for_deletion(derived_by_sample, user_id, objects_to_delete, log)         # derived_by_sample
                        set_entity_for_deletion(derived_sample, user_id, objects_to_delete, log)                # derived_sample
                    set_entity_for_deletion(sample, user_id, objects_to_delete, log)                            # sample
                    count_deleted += 1
            except sample_model.DoesNotExist:
                log.error(f"No sample found for identifier [{identifier}].")
                error_found = True
            except sample_model.MultipleObjectsReturned:
                log.error(f"Multiple samples found for identifier [{identifier}]. Provide a unique identifier.")
                error_found = True
            except Exception as err:
                log.error(str(err))
                error_found = True
    except LookupError:
        log.error("Model [Sample] does not exist.")
        error_found = True
    if not error_found:
        curation_code = None
        log.info(f"Deleted [{count_deleted}] samples.")
    return curation_code
