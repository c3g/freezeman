from django.apps import apps
from reversion.models import Version
from fms_core.models import Sample
import json
import logging


def rollback_extraction(params, log):
    log.info("Action [" + str(params["curation_index"]) + "] Extraction rollback started.")
    log.info("sample_extracted_id : " + str(params["sample_extracted_id"]))
    log.info("extraction_revision : " + str(params["extraction_revision"]))
    curation_code = params["curation_index"]
    sample_model = apps.get_model("fms_core", "Sample")
    try:
        sample_to = sample_model.objects.get(pk=params["sample_extracted_id"])
        versions = Version.objects.get_for_object(sample_to).filter(revision_id=params["extraction_revision"])
    except sample_model.DoesNotExist:
        log.error("Sample [" + str(params["sample_extracted_id"]) + "] does not exist.")
        sample_to = None
        versions = []
    if len(versions) > 0:
        log.info(versions[0].field_dict)
        sample_extracted_from = versions[0].field_dict["extracted_from_id"]
        try:
            sample_from = sample_model.objects.get(pk=sample_extracted_from)
            versions = Version.objects.get_for_object(sample_from)
        except sample_model.DoesNotExist:
            log.error("Sample source [" + str(params["sample_extracted_id"]) + "] does not exist.")
            versions = []
        version_rollback = None
        for index, version in enumerate(versions):
            if version.revision.id == params["extraction_revision"]:
                version_rollback = versions[index+1]
            else:
                log.info("version index [" + str(index) + "] skipped. Version id [" + str(version.id) + "]")
        if version_rollback:
            sample_to.delete()
            log.info("Sample [" + str(params["sample_extracted_id"]) + "] deleted.")
            # Rollback of sample extracted from using version preceding extraction revision
            version_rollback.revert()
            log.info("Sample [" + str(sample_extracted_from) + "] restored to version [" + str(version_rollback.id) + "].")
            curation_code = None
        else:
            log.error("Sample version to rollback to was not found.")
    else:
        log.error("Could not find sample [" + str(params["sample_extracted_id"]) + "] extracted during revision [" + str(params["extraction_revision"]) + "]")
    log.info("Extraction rollback complete.")
    return curation_code

