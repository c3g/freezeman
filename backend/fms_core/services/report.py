from datetime import datetime
from django.db.models import Count, F, Q, QuerySet
from fms_core.models import SampleByProject

def samples_by_project(project, start_date: datetime, end_date: datetime):
    return SampleByProject.objects.filter(project=project) \
                                  .annotate(creation_date=F("sample__creation_date")) \
                                  .filter(creation_date__gte=start_date, creation_date__lte=end_date)


def identity(x):
    return x

def extracted(samples_by_project: QuerySet) -> QuerySet:
    return samples_by_project.annotate(my_count=Count(
                "sample__derived_samples",
                filter=Q(sample__derived_samples__sample_kind__is_extracted=True)
            )).filter(my_count__gt=0)

def is_collected(samples_by_project: QuerySet) -> QuerySet:
    return samples_by_project.annotate(num_parents=Count('sample__child_of')) \
                  .filter(num_parents=0)

def is_library(samples_by_project: QuerySet) -> QuerySet:
    return samples_by_project.annotate(derived_library_count=Count(
                    "sample__derived_samples", filter=~Q(sample__derived_samples__library=None)
                )).filter(derived_library_count__gt=0)

def annotate_qc(samples_by_project: QuerySet):
    return samples_by_project.annotate(quality_flag=F("sample__quality_flag"), quantity_flag=F("sample__quantity_flag"))

def annotate_sample_kind(samples_by_project: QuerySet) -> QuerySet:
    return samples_by_project.annotate(sample_kind_name=F("sample__derived_samples__sample_kind__name"))


