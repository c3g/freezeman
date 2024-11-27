from fms_report.models.production_data import ProductionData
from fms_report.models.production_tracking import ProductionTracking

from fms_core.models._constants import ValidationStatus
from fms_core.models.readset import Readset
from fms_core.models.project import Project
from fms_core.models.sample import Sample
from fms_core.models.process import Process

from django.db.models import Q, F, When, Case, Prefetch, Count, Subquery, OuterRef, Sum, Max, Value, BigIntegerField, BooleanField, DateField, functions

def prepare_production_report_data(log):
    # Remove updated readsets from the data table
    try:
        log.info("Removing deprecated data.")
        deleted_rows, _ = ProductionData.objects.filter(readset_id__in=Readset.objects.exclude(production_tracking__validation_timestamp=F("validation_status_timestamp")).values_list("id", flat=True)).delete()
        log.info(f"Deleted {deleted_rows} rows from ProductionData table. Readset validation timestamp no longer match the prepared validation timestamp.")
    except Exception as err:
        log.error(f"ProductionData removal failure: {err}.")
    
    # Build a dictionary of investigators by external ids to prevent a costly join
    project_qs = Project.objects.exclude(external_id__isnull=True).exclude(principal_investigator="").all()
    investigator_by_external_id = {}
    for project in project_qs:
        investigator_by_external_id[project.external_id] = project.principal_investigator

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
    queryset = queryset.select_related("dataset__experiment_run__container__barcode")
    queryset = queryset.select_related("dataset__external_project_id")
    queryset = queryset.select_related("dataset__project_name")

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
    except Exception as err:
        log.error(f"Query preparation failure: {err}.")
        log.error(queryset.query)

    try:
        queryset = queryset.all().distinct().order_by().values("id",
                                                               "validation_status_timestamp",
                                                               "derived_sample_id",
                                                               "sample_name",
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
                                                               "dataset__lane",
                                                               "dataset__experiment_run__start_date",
                                                               "dataset__experiment_run__instrument__type__type",
                                                               "dataset__external_project_id",
                                                               "dataset__project_name",
                                                               "reads",
                                                               "bases")
    except Exception as err:
        log.error(f"Query execution failure: {err}.")

    try:
        for readset_data in queryset:
            ProductionData.objects.create(readset_id=readset_data["id"],
                                          sequencing_date=readset_data["dataset__experiment_run__start_date"],
                                          library_creation_date=readset_data["library_creation_date"],
                                          library_capture_date=readset_data["library_capture_date"],
                                          run_name=readset_data["dataset__experiment_run__name"],
                                          experiment_run_id=readset_data["dataset__experiment_run__id"],
                                          lane=readset_data["dataset__lane"],
                                          sample_name=readset_data["sample_name"],
                                          library_id=readset_data["derived_sample_id"],
                                          library_batch_id=readset_data["library_batch_id"],
                                          is_internal_library=readset_data["is_internal_library"],
                                          biosample_id=readset_data["derived_sample__biosample__id"],
                                          library_type=readset_data["derived_sample__library__library_type__name"],
                                          library_selection=readset_data["derived_sample__library__library_selection__target"],
                                          project=readset_data["dataset__project_name"],
                                          principal_investigator=investigator_by_external_id.get(readset_data["dataset__external_project_id"], None),
                                          taxon=readset_data["derived_sample__biosample__individual__taxon__name"],
                                          technology=readset_data["dataset__experiment_run__instrument__type__type"],
                                          reads=readset_data["reads"],
                                          bases=readset_data["bases"])
            ProductionTracking.objects.update_or_create(extracted_readset_id=readset_data["id"], defaults={"validation_timestamp": readset_data["validation_status_timestamp"]})
            
    except Exception as err:
        log.error(f"Data creation failure: {err}.")
        log.error(f"Readset {readset_data['id']} failed.")
