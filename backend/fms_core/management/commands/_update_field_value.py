from django.apps import apps
import reversion
import json
import logging
from reversion.models import Version
from fms_core.models import *

# Parameters required for this curation
ACTION = "action"                     # = update_field_value
CURATION_INDEX = "curation_index"     # Number indicating the order in which this action was performed during the curation.
COMMENT = "comment"                   # A comment to be stored in the logs. Optional.
ENTITY_MODEL = "entity_model"         # The name of the model for the target entity.
ENTITY_DICT_ID = "entity_identifier"  # An array of dictionary that contains the fields required to uniquely identify the targeted entity.
FIELD_NAME = "field_name"             # The name of the field that need to be updated.
VALUE_OLD = "value_old"               # The old value of the entity's field (used for validation). Optional. Validation skipped if empty.
VALUE_NEW = "value_new"               # The new value of the entity's field.
USER_ID = "requester_user_id"         # The user id of the person requesting the curation. Optional. If left empty, uses biobankadmin id.

# Curation params template
# { CURATION_INDEX: 1,
#   ACTION: "update_field_value",
#   COMMENT: "Dr. No asked the samples to be changed from BLOOD to PLASMA to correct an error at submission.",
#   ENTITY_MODEL: "Sample",
#   ENTITY_DICT_ID: [{"name": "Sample_test", "id": 42, "container_id": 5823}], # Any subset of fields that identifies uniquely the entity
#   FIELD_NAME: "sample_kind",
#   VALUE_OLD: 5, # Matches BLOOD
#   VALUE_NEW: 9, # Matches PLASMA 
#   USER_ID: 5
# }

# ENTITY_DICT_ID is an array to allow an identical change to be performed on multiple entities. If the changes are different,
# add more field_value_actions to the curation.

def update_field_value(params, objects_to_delete, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Update Field Value started.")
    log.info("Comment [" + str(params.get(COMMENT, "None")) + "].")
    log.info("Targeted model : " + str(params[ENTITY_MODEL]))
    log.info("Identifier used : " + str(params[ENTITY_DICT_ID]))
    log.info("Field to update : " + str(params[FIELD_NAME]))
    log.info("Old value : " + str(params.get(VALUE_OLD)))
    log.info("New value : " + str(params[VALUE_NEW]))
    log.info("Requester id : " + str(params.get(USER_ID)))

    # initialize the curation
    curation_code = params.get(CURATION_INDEX, "Invalid index")
    error_found = False
    model = params[ENTITY_MODEL]
    id_array = params[ENTITY_DICT_ID]
    field = params[FIELD_NAME]
    old_value = params.get(VALUE_OLD)
    new_value = params[VALUE_NEW]
    user_id = params.get(USER_ID)
    

    try:
        entity_model = apps.get_model("fms_core", model)
        count_updates = 0
        for id in id_array:
            try:
                entity = entity_model.objects.get(**id)
                try:
                    db_old_value = getattr(entity, field)
                    if old_value and old_value == db_old_value:
                        setattr(entity, field, new_value)
                        log.info(f"Updated model [{model}] id [{id} field [{field}] old value [{old_value}] new value [{new_value}].")
                        if user_id:
                            entity.save(requester_id=user_id) # Save using th id of the requester
                        else:
                            entity.save() # Save using the default admin user
                        count_updates += 1
                    else:
                        log.error(f"Content of field [{field}] do not match the old_value expected [{old_value}].")
                        error_found = True    
                except AttributeError:
                    log.error(f"Field [{field}] does not exist for model [{model}].")
                    error_found = True  
            except entity_model.DoesNotExist:
                log.error(f"No entity found for id [{id}].")
                error_found = True
            except entity_model.MultipleObjectsReturned:
                log.error(f"Multiple entities found for id [{id}]. Provide a unique identifier.")
                error_found = True
    except LookupError as e:
        log.error("Model [" + str(model) + "] does not exist.")
        error_found = True
    if not error_found:
        curation_code = None
        log.info(f"Updated [{count_updates}] field values.")
    return curation_code
