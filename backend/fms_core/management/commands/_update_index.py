from django.apps import apps
import reversion
import json
import logging
from reversion.models import Version
from fms_core.models import *

# Parameters required for this curation
ACTION = "action"                                       # = update_index
CURATION_INDEX = "curation_index"                       # Number indicating the order in which this action was performed during the curation.
COMMENT = "comment"                                     # A comment to be stored in the logs. Optional.
DERIVED_SAMPLE_IDENTIFIER = "derived_sample_identifier" # A dictionary that contains the fields required to uniquely identify the targeted derived sample.
INDEX_OLD = "index_old"                                 # The old value of the library's index (used for validation). Optional. Validation skipped if empty.
INDEX_NEW = "index_new"                                 # The new value of the library's index.
USER_ID = "requester_user_id"                           # The user id of the person requesting the curation. Optional. If left empty, uses biobankadmin id.

# Curation params template
# { CURATION_INDEX: 1,
#   ACTION: "update_index",
#   COMMENT: "Dr. No asked a libray index to be changed from [PATATE] to [CAROTTE].",
#   DERIVED_SAMPLE_IDENTIFIER: [{"biosample__alias": "Sample_test",
#                                "biosample__individual__id": 42,
#                                "samples__container__barcode": "PLATE_TEST",
#                                "samples__coordinate__name": "A01"}], # Any subset of fields that identifies uniquely the derived sample
#   INDEX_OLD: PATATE, # Matches erroneous index name
#   INDEX_NEW: CAROTTE, # Matches corrected index name
#   USER_ID: 5
# }

# Update_index curation is meant to simplify the updating of library index on multiple sample tied to the reported erroneous derived sample.
# An erroneous library index may be have childs or parents that share the library index issue. It is assumed that changing an 
# index will require the same change to be propagated to all the library lineage.

def update_index(params, objects_to_delete, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Update Index started.")
    log.info("Comment [" + str(params.get(COMMENT, "None")) + "].")
    log.info("Identifier used : " + str(params[DERIVED_SAMPLE_IDENTIFIER]))
    log.info("Old index : " + str(params.get(INDEX_OLD)))
    log.info("New index : " + str(params[INDEX_NEW]))
    log.info("Requester id : " + str(params.get(USER_ID)))

    # initialize the curation
    curation_code = params.get(CURATION_INDEX, "Invalid index")
    error_found = False
    derived_sample_id = params[DERIVED_SAMPLE_IDENTIFIER]
    old_index = params.get(INDEX_OLD)
    new_index = params[INDEX_NEW]
    user_id = params.get(USER_ID)
    

    try:
        derived_sample_model = apps.get_model("fms_core", "DerivedSample")
        index_model = apps.get_model("fms_core", "Index")
        count_updates = 0
        try:
            derived_sample = derived_sample_model.objects.get(**derived_sample_id)
            if derived_sample.library is not None:
                current_index = derived_sample.library.index.name
                if old_index is None or current_index == old_index:
                    try:
                        # get the new index id
                        index = index_model.objects.get(name=new_index)
                        # List all libraries that match the current sample lineage
                        libraries = []
                        # ascending

                        #current_sample = derived_sample.samples.
                        #while current_sample.is_library:
                        #    parent_sample = sample_model.objects.filter(parent_of=current_sample)
                        
                        # descending

                        # Apply the new index to the library identified
                        for library in libraries:
                            old_index_id = library.index_id
                            library.index_id = index.id
                            log.info(f"Updated model [library] id [{library.id} field [index_id] old value [{old_index_id}] new value [{index.id}].")
                            try:
                                library.save(requester_id=user_id) # Save using the id of the requester if present
                                count_updates += 1
                            except Exception as err:
                                log.error(f"Unexpected error. Error dump [" + str(err) + "]")
                                error_found = True
                    except index_model.DoesNotExist:
                        log.error(f"No index found for name [{new_index}].")
                        error_found = True
                    except index_model.MultipleObjectsReturned:
                        log.error(f"Multiple indices found for name [{new_index}]. Should be unique.")
                        error_found = True
                else:
                    log.error(f"Derived sample [{derived_sample.biosample.alias}] current index [{current_index}] does not match the expected validation value [{old_index}].")
                    error_found = True
            else:
                log.error(f"Derived sample [{derived_sample.biosample.alias}] is not a library. It does not have an index.")
                error_found = True
        except derived_sample_model.DoesNotExist:
            log.error(f"No derived sample found for id [{derived_sample_id}].")
            error_found = True
        except derived_sample_model.MultipleObjectsReturned:
            log.error(f"Multiple derived samples found for id [{derived_sample_id}]. Provide a unique identifier.")
            error_found = True
    except LookupError as e:
        log.error("Model [Sample] does not exist.")
        error_found = True
    if not error_found:
        curation_code = None
        log.info(f"Updated [{count_updates}] field values.")
    return curation_code
