from datetime import datetime
from django.db.models import Count, F, Q, QuerySet
from fms_core.models import SampleByProject

def samples_by_project(project, start_date: datetime, end_date: datetime):
    return SampleByProject.objects.filter(project=project) \
                                  .annotate(creation_date=F("sample__creation_date")) \
                                  .filter(creation_date__gte=start_date, creation_date__lte=end_date)

def extracted_samples(samples: QuerySet) -> QuerySet:
    return samples.annotate(my_count=Count(
                "derived_samples",
                filter=Q(derived_samples__sample_kind__is_extracted=True)
            )).filter(my_count=0)

def root_samples(samples: QuerySet) -> QuerySet:
    return samples.annotate(num_parents=Count('child_of')) \
                  .filter(num_parents=0)

def annotate_sample_kind(samples: QuerySet) -> QuerySet:
    return samples.annotate(sample_kind_names=F("derived_samples__sample_kind__name"))

def samples_with_libraries(samples: QuerySet) -> QuerySet:
    return samples.annotate(derived_library_count=Count(
                    "derived_samples", filter=~Q(derived_samples__library=None)
                )).filter(derived_library_count__gt=0)

def measurements_for_extraction(process_measurements: QuerySet) -> QuerySet:
    return process_measurements.filter(process__protocol__name__contains="Extraction")
