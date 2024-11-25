from fms_report.models.production_data import ProductionData
from fms_report.models.production_tracking import ProductionTracking

from fms_core.models._constants import ValidationStatus
from fms_core.models.readset import Readset
from fms_core.models.project import Project
from fms_core.models.sample import Sample

from django.db.models import Q, F, When, Case, BooleanField, Prefetch, Count, Subquery, OuterRef, Sum, Max, BigIntegerField, functions

def prepare_production_report_data(log):
    # Build a dictionary of investigators by external ids to prevent a costly join
    project_qs = Project.objects.exclude(external_id__isnull=True).exclude(principal_investigator="").all()
    investigator_by_external_id = {}
    for project in project_qs:
        investigator_by_external_id[project.external_id] = project.principal_investigator

    print(investigator_by_external_id)
    log.info("1")
    print("moo")
    queryset = Readset.objects.filter(validation_status=ValidationStatus.PASSED)
    log.info("2")
    queryset = queryset.exclude(production_tracking__validation_timestamp=F("validation_status_timestamp"))


    log.info("3")
    queryset = queryset.annotate(reads = Sum(functions.Cast("metrics__value_numeric", output_field=BigIntegerField()), filter= Q(metrics__name="nb_reads")))
    queryset = queryset.annotate(bases = Sum(functions.Cast("metrics__value_numeric", output_field=BigIntegerField()), filter= Q(metrics__name="yield")))
    log.info("4")

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
    queryset = queryset.select_related("derived_sample__library__library_selection__name")

    try:
        # Subquery for the library creation date
        library_creation_subquery = Sample.objects.filter(derived_samples__in=OuterRef("derived_sample_id")).filter(child_sample__process_measurement__process__protocol__name="Library Preparation").values("creation_date")
        queryset = queryset.annotate(library_creation_date=library_creation_subquery[:1])
    except Exception as err:
        print(err)

    try:
        queryset = queryset.all().distinct().order_by().values("derived_sample_id",
                                                               "sample_name",
                                                               "derived_sample__biosample__id",
                                                               "derived_sample__biosample__individual__taxon__name",
                                                               "library_creation_date",
                                                               "derived_sample__library__library_type__name",
                                                               "derived_sample__library__library_selection__name",
                                                              "dataset__experiment_run__id",                                                           
                                                              "dataset__experiment_run__name",
                                                              "dataset__lane",
                                                              "dataset__experiment_run__start_date",
                                                              "dataset__experiment_run__instrument__type__type",
                                                              "dataset__external_project_id",
                                                              "dataset__project_name",
                                                              "reads",
                                                              "bases")
    
        for value in queryset:
            print(value)
            
    except Exception as err:
        print(err)
    log.info("5")
    print(queryset.query)
    log.info("6")