from django.apps import apps

# Parameters required for this curation
ACTION = "action"                         # = delete_entity
CURATION_INDEX = "curation_index"         # Number indicating the order in which this action was performed during the curation.
COMMENT = "comment"                       # An optional comment to be stored in the logs
ENTITY_MODEL = "entity_model"             # The name of the model for the entity.
ENTITY_IDENTIFIERS = "entity_identifiers" # An array of entity identifier dictionaries that uniquely identify entities.
USER_ID = "requester_user_id"             # The user id of the person requesting the curation. Optional. If left empty, uses biobankadmin id.

# Curation params template
# { CURATION_INDEX: 1,
#   ACTION: "delete_entity",
#   COMMENT: "Dr. No asked to delete this derivedbysample. This sample is not inside the pool.",
#   ENTITY_MODEL: "derivedbysample",
#   ENTITY_IDENTIFIERS: [{"id": 10231}], # List of entity identifiers dict
#   USER_ID: 5
# }

# This is a risky operation. Given this is an operation done on unknown entity model,
# validations cannot be done to verify the object being deleted is still required.
# Does not remove related objects that are tied uniquely to that specific entity.
# Clean up need to be done through a previous or subsequent curation.

# Helper function that flags an entity for deletion and append the itself to the deletion list.
def set_entity_for_deletion(entity, requester_id, deletion_list, log):
    log.info(f"Flagging {entity.__class__.__name__} id [{entity.id}] for deletion")
    entity.deleted = True
    entity.save(requester_id=requester_id) # save using the id of the requester (using the default admin user if None)
    deletion_list.append(entity) # Delay deletion until after the revision block so the object get a version

def delete_entity(params, objects_to_delete, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Delete " + str(params[ENTITY_MODEL]) + " started.")
    log.info("Comment [" + str(params.get(COMMENT, "None")) + "].")
    log.info("Entity model : " + str(params[ENTITY_MODEL]) + ".")
    log.info("Entity identifiers : " + str(params[ENTITY_IDENTIFIERS]) + ".")
    log.info("Requester id : " + str(params.get(USER_ID)))

    # initialize the curation
    curation_code = params.get(CURATION_INDEX, "Invalid index")
    error_found = False
    entity_model = params[ENTITY_MODEL]
    identifiers_array = params[ENTITY_IDENTIFIERS]
    user_id = params.get(USER_ID)

    try:
        entity_model_obj = apps.get_model("fms_core", entity_model)
        count_deleted = 0
        for identifier in identifiers_array:
            try:
                entity_obj = entity_model_obj.objects.get(**identifier)
                set_entity_for_deletion(entity_obj, user_id, objects_to_delete, log)
                count_deleted += 1
            except entity_model_obj.DoesNotExist:
                log.error(f"No {entity_model} found for identifier [{identifier}].")
                error_found = True
            except entity_model_obj.MultipleObjectsReturned:
                log.error(f"Multiple {entity_model} entities found for identifier [{identifier}]. Provide a unique identifier.")
                error_found = True
            except Exception as err:
                log.error(str(err))
                error_found = True
    except LookupError:
        log.error(f"Model [{entity_model}] does not exist.")
        error_found = True
    if not error_found:
        curation_code = None
        log.info(f"Deleted [{count_deleted}] {entity_model} entities.")
    return curation_code