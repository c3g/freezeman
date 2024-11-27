from typing import List
import datetime
from django.apps import apps
from django.db.models import Q, F, When, Case, BooleanField, Prefetch, Count, Subquery, OuterRef, Sum, Max

from ..models import ExperimentRun, Process
from fms_report.models import Report, MetricField

AVAILABLE_REPORTS = ["production_report"]

REPORT_INFORMATION = {
    "production_report": {
        "aggregated_metrics": ["biosample", "library", "reads", "bases"],
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
    if report_info:
        if is_detailed_report:
            pass
        else:
            # Add grouping annotations
            queryset = queryset.values(*grouped_by)
            # Add metrics column to the queryset
            # sample_count
            queryset = queryset.annotate(sample_count=Count(F("biosample"), distinct=True))
            # library_count
            queryset = queryset.annotate(library_count=Count(F("library"), distinct=True))
            # read_count
            queryset = queryset.annotate(read_count=Sum(F("reads")))
            # base_count
            queryset = queryset.annotate(base_count=Sum(F("bases")))
            for entry in queryset.all().distinct():
                print(entry)
    toc = datetime.datetime.now()
    duration = toc - tic
    print(duration)
    return report_data, errors, warnings

def _get_queryset(name: str, start_date: str, end_date: str):
    """
    Provides for each report the basic report quesyset

      Args:
          `name`: name of the report
          `start_date`: start of the report time period requested
          `end_date`: end of the report time period requested
    """
    
    # For now this assumes only one field is designated as is_date by report. Once we set more date fields we would need to have the date field name as input.
    report_data = MetricField.objects.filter(report__name=name).annotate(date_field=F("name")).filter(is_date=True).values("report__data_model", "date_field")[:1]
    DataModel = apps.get_model("fms_report", report_data[0]["report__data_model"])
    print(report_data)
    queryset = ( DataModel.objects.annotate(date_field=F(report_data[0]["date_field"]))
                                  .filter(date_field__gte=start_date)
                                  .filter(date_field__lte=end_date)
                                  .distinct()
                                  .order_by() )

    return queryset