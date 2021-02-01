from django.apps import apps
from reversion.models import Revision
from fms_core.models import Sample
import json
import logging

# Parameters required for this curation
ACTION = "action"  # = rollback_curation
CURATION_INDEX = "curation_index"  # Number indicating the order in which this action was performed during the curation.
CURATION_REVISION_ID = "curation_revision"  # The id of the curation revision to be rolled back.

# Curation params template
# {CURATION_INDEX:1,ACTION:"rollback_curation",CURATION_REVISION_ID:835}

# Other constants


def rollback_curation(params, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Curation rollback started.")
    log.info("Revision of the curation to rollback : " + str(params[CURATION_REVISION_ID]))
    curation_code = params["curation_index"]
    try:
        curation_revision = Revision.objects.get(pk=params[CURATION_REVISION_ID])
        curation_revision.revert()
        curation_code = None
        log.info("Curation rollback complete.")
    except Revision.DoesNotExist:
        log.error("Failed to find revision [" + str(params[CURATION_REVISION_ID]) + "]")
        log.info("Curation rollback failed.")
    return curation_code
