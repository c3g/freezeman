from django.apps import apps
import reversion
import json
import logging
from reversion.models import Version
from fms_core.models import Individual

# Parameters required for this curation
ACTION = "action"                     # = delete_individual
CURATION_INDEX = "curation_index"     # Number indicating the order in which this action was performed during the curation.
COMMENT = "comment"                   # An optional comment to be stored in the logs
INDIVIDUAL_NAMES = "individual_names" # An array of individual name that are to be deleted.
USER_ID = "requester_user_id"         # The user id of the person requesting the curation. Optional. If left empty, uses biobankadmin id.

# Curation params template
# { CURATION_INDEX: 1,
#   ACTION: "delete_individual",
#   COMMENT: "Dr. No asked to delete these individuals that are not used.",
#   INDIVIDUAL_NAMES: ["Roger", "TiPaul", "Gertrude"], # List of individual names (unique) to be deleted
#   USER_ID: 5
# }

# This curation deletes only individual that are not referenced. Remove individual from samples references using "update_field_value" first.
# To delete parents, a first curation need to be run to delete the child individual (or an update), then parents will be unreferenced.

# function that checks the references to an individual and list them.
def list_references(individual):
    links = []
    mother_of = list(individual.mother_of.all())
    if mother_of:
        links.append(f"Mother of {[child.name for child in mother_of]}.")
    father_of = list(individual.father_of.all())
    if father_of:
        links.append(f"Father of {[child.name for child in father_of]}.")
    samples = list(individual.samples.all())
    if samples:
        links.append(f"Has samples {[sample.id for sample in samples]}")
    return links


def delete_individual(params, objects_to_delete, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Update Field Value started.")
    log.info("Comment [" + str(params.get(COMMENT, "None")) + "].")
    log.info("Individual names : " + str(params[INDIVIDUAL_NAMES]) + ".")
    log.info("Requester id : " + str(params.get(USER_ID)))

    # initialize the curation
    curation_code = params.get(CURATION_INDEX, "Invalid index")
    error_found = False
    name_array = params[INDIVIDUAL_NAMES]
    user_id = params.get(USER_ID)

    try:
        individual_model = apps.get_model("fms_core", "Individual")
        count_deleted = 0
        for name in name_array:
            try:
                individual = individual_model.objects.get(name=name)
                links = list_references(individual)
                if links:
                    log.error(f"Individual [{name}] is still referenced. {links}")
                    error_found = True
                else:
                    log.info(f"Deleted [Individual] name [{individual.name}] id [{individual.id}]].")
                    individual.deleted = True
                    individual.save(requester_id=user_id) # save using the id of the requester (using the default admin user if None)
                    objects_to_delete.append(individual)  # Delay deletion until after the revision block so the object get a version
                    count_deleted += 1
            except individual_model.DoesNotExist:
                log.error(f"No individual found for name [{name}].")
                error_found = True
            except individual_model.MultipleObjectsReturned:
                log.error(f"Multiple individuals found for name [{name}]. Provide a unique identifier.")
                error_found = True
    except LookupError:
        log.error("Model [Individual] does not exist.")
        error_found = True
    if not error_found:
        curation_code = None
        log.info(f"Deleted [{count_deleted}] individuals.")
    return curation_code
