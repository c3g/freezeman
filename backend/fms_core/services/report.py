from typing import List

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
    report_info = REPORT_INFORMATION.get(name, {})
    queryset = _get_queryset(name, start_date, end_date)
    print(grouped_by)
    if report_info:
        if is_detailed_report:
            pass
        else:
            print("Yoga")
            # Add metrics column to the queryset
            # sample_count
            queryset = queryset.annotate(sample_count=Count("container__samples__derived_samples__biosample_id"))
            # library_count
            queryset = queryset.annotate(library_count=Count("container__samples__derived_samples__id"))
            # read_count
            read_count = Sum("datasets__readsets__metrics__value_numeric", filter=Q(datasets__readsets__metrics__name="nb_reads"))
            queryset = queryset.annotate(read_count=read_count)
            # base_count
            base_count = Sum("datasets__readsets__metrics__value_numeric", filter=Q(datasets__readsets__metrics__name="yield"))
            queryset = queryset.annotate(base_count=base_count)
            print("Yogotoga")
            try:
                # Add grouping annotations
                # library_type
                queryset = queryset.annotate(library_type=F("container__samples__derived_samples__library__library_type__name"))
                # project
                queryset = queryset.annotate(project=F("container__samples__derived_by_samples__project__name"))
                # taxon
                queryset = queryset.annotate(taxon=F("container__samples__derived_samples__biosample__individual__taxon__name"))
                # technology
                queryset = queryset.annotate(technology=F("instrument__type__type"))
            except Exception as err:
                print(err)
            print("Patchouli")
            try:
                # list_header
                header = grouped_by.append(report_info["aggregated_metrics"])
                print(header)
                # Get values
                report_values = queryset.values_list(*header, flat=True)
            except Exception as err:
                print(err)
            print(report_values)

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
                                                  .order_by()
    }

    return BASE_QUERY_SET.get(name, None)