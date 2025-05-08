from fms_report.models.production_data import ProductionData
from fms_report.models.production_tracking import ProductionTracking

from fms_core.models._constants import ValidationStatus
from fms_core.models.readset import Readset
from fms_core.models.project import Project
from fms_core.models.sample import Sample
from fms_core.models.process import Process

from django.db.models import Q, F, When, Case, OuterRef, Sum, Value, BigIntegerField, BooleanField, DateField, functions

def prepare_production_report_data(log):
    """
    Prepares the data for production report. Based on readsets that passed validation. 
    If the readset validation timestamp does not match the stored value in the production tracking table, existing report data (if any) is removed and preparation is done.

    Args:
        `log`: active logger to keep informed on preparation

    Raises:
        `removal_err`: An error happened while removing existing data from deprecated readsets.
        `query_err`: An error happened while preparing the queryset for the data extraction.
        `exec_err`: An error happened while executing the data extraction query.
        `create_err`: An error happened while creating a production data entry.
    """
    # Remove updated readsets from the data table
    try:
        log.info("Removing deprecated data.")
        deleted_rows, _ = ProductionData.objects.filter(readset_id__in=Readset.objects.exclude(production_tracking__validation_timestamp=F("validation_status_timestamp")).values_list("id", flat=True)).delete()
        log.info(f"Deleted {deleted_rows} rows from ProductionData table. Readset validation timestamp no longer match the prepared validation timestamp.")
    except Exception as removal_err:
        log.error(f"ProductionData removal failure: {removal_err}.")
        raise removal_err
    
    queryset = Readset.objects.filter(validation_status=ValidationStatus.PASSED)
    queryset = queryset.exclude(production_tracking__validation_timestamp=F("validation_status_timestamp"))

    queryset = queryset.annotate(reads = Sum(functions.Cast("metrics__value_numeric", output_field=BigIntegerField()), filter= Q(metrics__name="nb_reads")))
    queryset = queryset.annotate(bases = Sum(functions.Cast("metrics__value_numeric", output_field=BigIntegerField()), filter= Q(metrics__name="yield")))

    # Dataset based information
    queryset = queryset.select_related("dataset__lane")
    queryset = queryset.select_related("dataset__experiment_run__start_date")
    queryset = queryset.select_related("dataset__experiment_run__name")
    queryset = queryset.select_related("dataset__experiment_run__id")
    queryset = queryset.select_related("dataset__experiment_run__instrument__type__type")
    queryset = queryset.select_related("dataset__experiment_run__container__kind")
    queryset = queryset.select_related("dataset__project_id")

    # Derived sample based information
    queryset = queryset.select_related("derived_sample__biosample__id")
    queryset = queryset.select_related("derived_sample__biosample__individual__taxon__name")
    queryset = queryset.select_related("derived_sample__library__library_type__name")
    queryset = queryset.select_related("derived_sample__library__library_selection__target")

    try:
        # Subquery for the library capture date
        library_capture_subquery = Sample.objects.filter(derived_samples__in=OuterRef("derived_sample_id")).filter(child_sample__process_measurement__process__protocol__name="Library Capture").values("creation_date")
        queryset = queryset.annotate(library_capture_date=library_capture_subquery[:1])

        # Subquery for the library creation date
        basic_library_creation_subquery = Sample.objects.filter(derived_samples__in=OuterRef("derived_sample_id")).filter(child_sample__process_measurement__process__protocol__name="Library Preparation").values("creation_date")
        captured_library_creation_subquery = Sample.objects.filter(derived_samples__in=OuterRef("derived_sample__derived_from_id")).filter(child_sample__process_measurement__process__protocol__name="Library Preparation").values("creation_date")
        queryset = queryset.annotate(library_creation_date=Case(When(library_capture_date__isnull=True, then=basic_library_creation_subquery[:1]), default=captured_library_creation_subquery[:1], output_field=DateField()))

        # Subquery for the library batch id (process id)
        basic_library_process_subquery =  Process.objects.filter(process_measurement__lineage__child__derived_samples__in=OuterRef("derived_sample_id")).filter(protocol__name="Library Preparation").values("id")
        captured_library_process_subquery =  Process.objects.filter(process_measurement__lineage__child__derived_samples__in=OuterRef("derived_sample__derived_from_id")).filter(protocol__name="Library Preparation").values("id")
        queryset = queryset.annotate(library_batch_id=Case(When(library_capture_date__isnull=True, then=basic_library_process_subquery[:1]), default=captured_library_process_subquery[:1], output_field=BigIntegerField()))

        # internal library
        queryset = queryset.annotate(is_internal_library = Case(When(library_creation_date__isnull=True, then=Value(False)), default=Value(True), output_field=BooleanField()))
    except Exception as query_err:
        log.error(f"Query preparation failure: {query_err}.")
        log.error(queryset.query)
        raise query_err

    try:
        queryset = queryset.all().distinct().order_by().values("id",
                                                               "validation_status_timestamp",
                                                               "derived_sample_id",
                                                               "derived_sample__biosample__id",
                                                               "derived_sample__biosample__individual__taxon__name",
                                                               "library_creation_date",
                                                               "library_capture_date",
                                                               "is_internal_library",
                                                               "derived_sample__library__library_type__name",
                                                               "derived_sample__library__library_selection__target",
                                                               "library_batch_id",
                                                               "dataset__experiment_run__id",                                                           
                                                               "dataset__experiment_run__name",
                                                               "dataset__experiment_run__container__kind",
                                                               "dataset__lane",
                                                               "dataset__experiment_run__start_date",
                                                               "dataset__experiment_run__instrument__type__type",
                                                               "dataset__project_id",
                                                               "reads",
                                                               "bases")
    except Exception as exec_err:
        log.error(f"Query execution failure: {exec_err}.")
        raise exec_err

    try:
        for readset_data in queryset:
            ProductionData.objects.create(readset_id=readset_data["id"],
                                          sequencing_date=readset_data["dataset__experiment_run__start_date"],
                                          library_creation_date=readset_data["library_creation_date"],
                                          library_capture_date=readset_data["library_capture_date"],
                                          run_name=readset_data["dataset__experiment_run__name"],
                                          experiment_run_id=readset_data["dataset__experiment_run__id"],
                                          experiment_container_kind=readset_data["dataset__experiment_run__container__kind"],
                                          lane=readset_data["dataset__lane"],
                                          library_id=readset_data["derived_sample_id"],
                                          library_batch_id=readset_data["library_batch_id"],
                                          is_internal_library=readset_data["is_internal_library"],
                                          biosample_id=readset_data["derived_sample__biosample__id"],
                                          library_type=readset_data["derived_sample__library__library_type__name"],
                                          library_selection=readset_data["derived_sample__library__library_selection__target"],
                                          project_id=readset_data["dataset__project_id"],
                                          taxon=readset_data["derived_sample__biosample__individual__taxon__name"],
                                          technology=readset_data["dataset__experiment_run__instrument__type__type"],
                                          reads=readset_data["reads"],
                                          bases=readset_data["bases"])
            ProductionTracking.objects.update_or_create(extracted_readset_id=readset_data["id"], defaults={"validation_timestamp": readset_data["validation_status_timestamp"]})
            
    except Exception as create_err:
        log.error(f"Data creation failure: {create_err}.")
        log.error(f"Readset {readset_data['id']} failed.")
        raise create_err
