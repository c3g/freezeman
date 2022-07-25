from django.apps import apps
from django.core.exceptions import FieldError, ValidationError
import reversion
import json
import logging
from reversion.models import Version
from fms_core.models import *

# Parameters required for this curation
ACTION = "action"                     # = create_entity
CURATION_INDEX = "curation_index"     # Number indicating the order in which this action was performed during the curation.
COMMENT = "comment"                   # A comment to be stored in the logs. Optional.
ENTITY_MODEL = "entity_model"         # The name of the model for the entity.
ENTITY_DICT = "entity_dictionary"     # An array of dictionary that contains the fields required to created the entity.
USER_ID = "requester_user_id"         # The user id of the person requesting the curation. Optional. If left empty, uses biobankadmin id.

# Curation params template
# { CURATION_INDEX: 1,
#   ACTION: "create_entity",
#   COMMENT: "Dr. No asked the samples to be changed from BLOOD to PLASMA to correct an error at submission.",
#   ENTITY_MODEL: "Taxon",
#   ENTITY_DICT: {"name": "Canis lupus familiaris", "ncbi_id": 9615},
#   USER_ID: 5
# }

# ENTITY_DICT is an array to allow the creation of entity of the same model without creating another action. If the models are different,
# add more field_value_actions to the curation.

def create_entity(params, objects_to_delete, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Update Field Value started.")
    log.info("Comment [" + str(params.get(COMMENT, "None")) + "].")
    log.info("Targeted model : " + str(params[ENTITY_MODEL]))
    log.info("Entities to create : " + str(params[ENTITY_DICT]))
    log.info("Requester id : " + str(params.get(USER_ID)))

    # initialize the curation
    curation_code = params.get(CURATION_INDEX, "Invalid index")
    error_found = False
    model = params[ENTITY_MODEL]
    entity_array = params[ENTITY_DICT]
    user_id = params.get(USER_ID)
    

    try:
        entity_model = apps.get_model("fms_core", model)
        count_creations = 0
        for entity in entity_array:
            try:
                entity = entity_model.objects.create(**entity, created_by_id=user_id, modified_by_id=user_id)
                if entity is not None:
                    log.info(f"New entity of model [{model}] was created using these data [{entity}].")
                    count_creations += 1
                else:
                    log.error(f"Entity [{entity}] of model [{model}] cannot be created.")
                    error_found = True    
            except FieldError as FieldErr:
                log.error(f"Encountered an error while creating entity of model [{model}]. Unrecognized field name or value.")
                log.error(FieldErr)
                error_found = True  
            except ValidationError as ValErr:
                log.error(f"Encountered an error while creating entity of model [{model}]. Failed the validation of a field value.")
                log.error(ValErr)
                error_found = True
    except LookupError as e:
        log.error("Model [" + str(model) + "] does not exist.")
        error_found = True
    if not error_found:
        curation_code = None
        log.info(f"Created [{count_creations}] entity of model [{model}].")
    return curation_code
