from django.apps import apps

# Parameters required for this curation
ACTION = "action"                         # = delete_datasetfile
CURATION_INDEX = "curation_index"         # Number indicating the order in which this action was performed during the curation.
COMMENT = "comment"                       # An optional comment to be stored in the logs
DATASETFILE_PATHS = "datasetfile_paths"   # An array of unique datasetfile paths that are to be deleted.
USER_ID = "requester_user_id"             # The user id of the person requesting the curation. Optional. If left empty, uses biobankadmin id.

# Curation params template
# { CURATION_INDEX: 1,
#   ACTION: "delete_datasetfile",
#   COMMENT: "Mr. T asked to delete these datasetfiles that do not exist on disk.",
#   DATASETFILE_PATHS: ["/home/momo/my_poutine_recipes/poutine_au_poil.txt", "/dataset/my_datasets_are_empty/empty.fastq"], # List of datasets paths (unique) to be deleted
#   USER_ID: 5
# }

# This curation deletes all datasetsfiles listed. If a datasetfile is not found, it is skipped and the curation continues.
# Make sure that a file_path update_field_value is not the best solution first.
# This can leave a readset without any data files attached.

def delete_datasetfile(params, objects_to_delete, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Delete DatasetFile started.")
    log.info("Comment [" + str(params.get(COMMENT, "None")) + "].")
    log.info("Datasetfile paths : " + str(params[DATASETFILE_PATHS]) + ".")
    log.info("Requester id : " + str(params.get(USER_ID)))

    # initialize the curation
    curation_code = params.get(CURATION_INDEX, "Invalid index")
    error_found = False
    file_path_array = params[DATASETFILE_PATHS]
    user_id = params.get(USER_ID)

    try:
        datasetfile_model = apps.get_model("fms_core", "DatasetFile")
        count_deleted = 0
        for file_path in file_path_array:
            try:
                datasetfile = datasetfile_model.objects.get(file_path=file_path)
                log.info(f"Deleted [DatasetFile] at path [{datasetfile.file_path}] id [{datasetfile.id}]].")
                datasetfile.deleted = True
                datasetfile.save(requester_id=user_id) # save using the id of the requester (using the default admin user if None)
                objects_to_delete.append(datasetfile)  # Delay deletion until after the revision block so the object get a version
                count_deleted += 1
            except datasetfile_model.DoesNotExist:
                log.error(f"No datasetfile found for file path [{file_path}].")
            except datasetfile_model.MultipleObjectsReturned:
                log.error(f"Multiple datasetfiles found for file path [{file_path}]. Check database integrity.")
                error_found = True
    except LookupError:
        log.error("Model [DatasetFile] does not exist.")
        error_found = True
    if not error_found:
        curation_code = None
        log.info(f"Deleted [{count_deleted}] datasetfiles.")
    return curation_code