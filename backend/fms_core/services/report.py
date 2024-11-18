from typing import List
import datetime

from django.db.models import Q, F, When, Case, BooleanField, Prefetch, Count, Subquery, OuterRef, Sum, Max

from ..models import ExperimentRun, Process

AVAILABLE_REPORTS = ["production_report"]

REPORT_INFORMATION = {
    "production_report": {
        "aggregated_metrics": ["sample_count", "library_count", "read_count", "base_count"],
        "groups": ["library_type","project","taxon","technology"],  # Add technology_detailed once the rest is working
        "time_aggregation": ["daily", "weekly", "monthly"],
    },
}

def get_report(name: str, grouped_by: List[str], time_aggregation: str, start_date: str, end_date: str):
    report_data = {}
    errors = {}
    warnings = {}
    is_detailed_report = (len(grouped_by) == 0)
    headers = grouped_by
    report_info = REPORT_INFORMATION.get(name, {})
    tic = datetime.datetime.now()
    queryset = _get_queryset(name, start_date, end_date)
    print(queryset)
    queryset.select_related("container__samples")
    queryset.select_related("datasets__readsets__metrics")
    if report_info:
        if is_detailed_report:
            pass
        else:
            # Add grouping annotations
            for group_by in grouped_by:
                match group_by:
                    case "library_type":
                        queryset = queryset.annotate(library_type=F("container__samples__derived_samples__library__library_type__name"))
                    case "project":
                        queryset = queryset.annotate(project=F("container__samples__derived_by_samples__project__name"))
                    case "taxon":
                        queryset = queryset.annotate(taxon=F("container__samples__derived_samples__biosample__individual__taxon__name"))
                    case "technology":
                        queryset = queryset.annotate(technology=F("instrument__type__type"))
            queryset = queryset.values(*grouped_by)
            print(queryset)
            print("Yoga")
            # Add metrics column to the queryset
            # sample_count
            queryset = queryset.annotate(sample_count=Count(F("container__samples__derived_samples__biosample__id"), distinct=True))
            # library_count
            queryset = queryset.annotate(library_count=Count(F("container__samples__derived_samples__id"), distinct=True))
            # read_count
            read_count = Sum(F("datasets__readsets__metrics__value_numeric"), filter=Q(datasets__readsets__derived_sample_id=F("container__samples__derived_samples__id")) & Q(datasets__readsets__metrics__name="nb_reads"), distinct=True)
            queryset = queryset.annotate(read_count=read_count)
            # base_count
            #base_count = Sum(F("datasets__readsets__metrics__value_numeric"), filter=Q(datasets__readsets__metrics__name="yield"), distinct=True)
            #queryset = queryset.annotate(base_count=base_count)
            print("Yogotoga")
            print(queryset.query)
            for entry in queryset.all().distinct():
                print(entry)
            print("Patchouli")
    toc = datetime.datetime.now()
    duration = toc - tic
    print(duration)
    print("Matamout")
    return report_data, errors, warnings

def _get_queryset(name: str, start_date: str, end_date: str):
    """
    Provides for each report the basic report quesyset

      Args:
          `name`: name of the report
          `start_date`: start of the report time period requested
          `end_date`: end of the report time period requested
    """
    BASE_QUERY_SET = {
        "production_report": ExperimentRun.objects.filter(process__process_measurement__execution_date__gte=start_date)
                                                  .filter(process__process_measurement__execution_date__lte=end_date)
                                                  .distinct()
                                                  .order_by()
    }

    return BASE_QUERY_SET.get(name, None)