from django.apps import apps

# Parameters required for this curation
ACTION = "action"                         # = delete_dataset
CURATION_INDEX = "curation_index"         # Number indicating the order in which this action was performed during the curation.
COMMENT = "comment"                       # An optional comment to be stored in the logs
DATASET_IDS = "dataset_ids"                 # An array of unique dataset ids that are to be deleted.
USER_ID = "requester_user_id"             # The user id of the person requesting the curation. Optional. If left empty, uses biobankadmin id.

# Curation params template
# { CURATION_INDEX: 1,
#   ACTION: "delete_dataset",
#   COMMENT: "Mr. T asked to delete these dataset that are dangling.",
#   DATASET_IDS: [31313, 333111], # List of datasets ids (unique) to be deleted
#   USER_ID: 5
# }

# This curation deletes all datasets listed as well as all related objects and report data tied to them. If a dataset is not found, it is skipped and the curation continues.
# Make sure that an update_field_value is not the best solution first.

def delete_dataset(params, objects_to_delete, log):
    log.info("Action [" + str(params[CURATION_INDEX]) + "] Delete DatasetFile started.")
    log.info("Comment [" + str(params.get(COMMENT, "None")) + "].")
    log.info("Dataset ids : " + str(params[DATASET_IDS]) + ".")
    log.info("Requester id : " + str(params.get(USER_ID)))

    # initialize the curation
    curation_code = params.get(CURATION_INDEX, "Invalid index")
    error_found = False
    dataset_ids_array = params[DATASET_IDS]
    user_id = params.get(USER_ID)

    try:
        dataset_model = apps.get_model("fms_core", "Dataset")
        readset_model = apps.get_model("fms_core", "Readset")
        datasetfile_model = apps.get_model("fms_core", "DatasetFile")
        metrics_model = apps.get_model("fms_core", "Metrics")
        count_deleted = 0
        for dataset_id in dataset_ids_array:
            try:
                dataset = dataset_model.objects.get(id=dataset_id)
                log.info(f"Deleted [Dataset] id [{dataset.id}]].")
                dataset.deleted = True
                dataset.save(requester_id=user_id) # save using the id of the requester (using the default admin user if None)
                objects_to_delete.append(dataset)  # Delay deletion until after the revision block so the object get a version
                count_deleted += 1
                 # Iterate through related items for deletion
                 

            except dataset_model.DoesNotExist:
                log.error(f"No dataset found for id [{dataset_id}].")
            except dataset_model.MultipleObjectsReturned:
                log.error(f"Multiple datasets found for id [{dataset_id}]. Check database integrity.")
                error_found = True
    except LookupError:
        log.error("Model [Dataset] does not exist.")
        error_found = True
    if not error_found:
        curation_code = None
        log.info(f"Deleted [{count_deleted}] datasets.")
    return curation_code