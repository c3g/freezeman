from django.apps import apps
import reversion
import json
import logging
from reversion.models import Version
from fms_core.models import Container
from fms_core.services.container import can_remove_container

# Parameters required for this curation
ACTION = "action"                         # = delete_container
CURATION_INDEX = "curation_index"         # Number indicating the order in which this action was performed during the curation.
COMMENT = "comment"                       # An optional comment to be stored in the logs
CONTAINER_BARCODES = "container_barcodes" # An array of container barcode that are to be deleted.
USER_ID = "requester_user_id"             # The user id of the person requesting the curation. Optional. If left empty, uses biobankadmin id.

# Curation params template
# { CURATION_INDEX: 1,
#   ACTION: "delete_container",
#   COMMENT: "Dr. No asked to delete these containers that are not used.",
#   CONTAINER_BARCODES: ["PlateRatapoil1", "TubePleinDeGlue", "RackFrise"], # List of container barcodes (unique) to be deleted
#   USER_ID: 5
# }

# This curation deletes only containers that are not referenced. Remove containers starting with leaf containers first.
# If containers contains samples and the container need to be removed, remove or move samples first.
# If the container is used in an experiment run it is unwise to remove it.

# function that checks the references to a container and list them.
def list_references_to(container):
    links = []
    parent_of = list(container.children.all())
    if parent_of:
        links.append(f"Parent of {[child.barcode for child in parent_of]}.")
    contained_samples = list(container.samples.all())
    if contained_samples:
        links.append(f"Contain samples {[sample.name for sample in contained_samples]}.")
    if hasattr(container, 'experiment_run'):
        run_container = list(container.experiment_run.all())
        if run_container:
            links.append(f"Used in run {[run.name for run in run_container]}")
    return links


def delete_container(params, objects_to_delete, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Delete Container started.")
    log.info("Comment [" + str(params.get(COMMENT, "None")) + "].")
    log.info("Container barcodes : " + str(params[CONTAINER_BARCODES]) + ".")
    log.info("Requester id : " + str(params.get(USER_ID)))

    # initialize the curation
    curation_code = params.get(CURATION_INDEX, "Invalid index")
    error_found = False
    barcode_array = params[CONTAINER_BARCODES]
    user_id = params.get(USER_ID)

    try:
        container_model = apps.get_model("fms_core", "Container")
        count_deleted = 0
        for barcode in barcode_array:
            try:
                container = container_model.objects.get(barcode=barcode)
                log.info(f"Checking if container [{barcode}] can be removed.")
                is_removable, _, _ = can_remove_container(container)
                if not is_removable:
                    links = list_references_to(container)
                    log.error(f"Container [{barcode}] is still referenced. {links}")
                    error_found = True
                else:
                    log.info(f"Deleted [Container] barcode [{container.barcode}] id [{container.id}]].")
                    container.deleted = True
                    container.save(requester_id=user_id) # save using the id of the requester (using the default admin user if None)
                    objects_to_delete.append(container)  # Delay deletion until after the revision block so the object get a version
                    count_deleted += 1
            except container_model.DoesNotExist:
                log.error(f"No container found for barcode [{barcode}].")
                error_found = True
            except container_model.MultipleObjectsReturned:
                log.error(f"Multiple containers found for barcode [{barcode}]. Provide a unique identifier.")
                error_found = True
    except LookupError:
        log.error("Model [Container] does not exist.")
        error_found = True
    if not error_found:
        curation_code = None
        log.info(f"Deleted [{count_deleted}] containers.")
    return curation_code
