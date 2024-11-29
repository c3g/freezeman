from typing import List
import datetime
from collections import defaultdict
import pandas as pd
from django.apps import apps
from django.db.models import F, Count,  Sum, Max, Min, TextChoices, functions

from fms_report.models import Report, MetricField
from fms_report.models._constants import AggregationType

class TimeWindow(TextChoices):
    MONTHLY = "month", "Monthly"
    WEEKLY = "week", "Weekly"
    DAILY = "day", "Daily"

def get_date_range_with_window(start_date: str, end_date: str, time_window: TimeWindow):
    time_series = pd.date_range(start=start_date, end=end_date).to_series()
    match time_window:
        case TimeWindow.MONTHLY: 
            window_time_series = time_series.to_numpy().astype('datetime64[M]')
        case TimeWindow.WEEKLY:
            window_time_series = time_series - pd.to_timedelta(time_series.dt.dayofweek, unit="D")
        case TimeWindow.DAILY:
             window_time_series = time_series

    date_range = pd.to_datetime(time_series, unit='D')
    time_window_range = pd.to_datetime(window_time_series, unit='D')
    return date_range, time_window_range

def list_reports():
    return Report.objects.values_list("name", flat=True)

def list_report_information(name: str):
    queryset = MetricField.objects.filter(report__name=name).all()
    groups = [field.name for field in queryset if field.is_group]
    time_windows = [TimeWindow.DAILY.label, TimeWindow.WEEKLY.label, TimeWindow.MONTHLY.label]
    report_info = {"name": name,
                   "groups": groups,
                   "time_windows": time_windows}
    return report_info

def get_report(name: str, grouped_by: List[str], time_window: TimeWindow, start_date: str, end_date: str):
    report_data = {}
    queryset = _get_queryset(name, start_date, end_date, time_window, grouped_by)
    report_by_time_window = defaultdict(list)
    for entry in queryset:
        current_row = {key: value for key, value in entry.items() if not key=="time_window"}
        report_by_time_window[entry["time_window"]].append(current_row)
  
    headers = [column for column in queryset.first().keys() if not column=="time_window"]  
    report_data = {
        "name": name,
        "start_date": start_date,
        "end_date": end_date,
        "time_window": time_window.label,
        "grouped_by": grouped_by,
        "headers": headers,
    }

    date_range, date_time_windows = get_date_range_with_window(start_date, end_date, time_window)
    data = []
    current_data = {}
    for date, time_window in zip(date_range, date_time_windows):
        current_time_window = current_data.get("time_window", None)
        if current_time_window is not None and not current_time_window == time_window.date():
                data.append(current_data)
                current_data = {}
        current_data["time_window"] = time_window.date()
        if current_data.get("time_window_start", None) is None:
            current_data["time_window_start"] = date.date()
            current_data["time_window_data"] = report_by_time_window.get(time_window.date(), None)
        current_data["time_window_end"] = date.date()
    data.append(current_data)
    report_data["data"] = data

    return report_data

def _get_queryset(name: str, start_date: str, end_date: str, time_window: TimeWindow, grouped_by: List[str]):
    """
    Provides for each report the basic report quesyset

      Args:
          `name`: name of the report
          `start_date`: start of the report time period requested
          `end_date`: end of the report time period requested
          `time_range`: size of the report page in time.
          `grouped_by`: fields that drive the aggregation of data in order.
    """
    
    # For now this assumes only one field is designated as is_date by report. Once we set more date fields we would need to have the date field name as input.
    report_data = MetricField.objects.filter(report__name=name).annotate(date_field=F("name")).filter(is_date=True).values("report__data_model", "date_field")[:1]
    if report_data:
        DataModel = apps.get_model("fms_report", report_data[0]["report__data_model"])

        queryset = ( DataModel.objects.annotate(date_field=F(report_data[0]["date_field"]))
                                      .annotate(time_window=functions.Trunc(F("date_field"), time_window.value))
                                      .filter(date_field__gte=start_date)
                                      .filter(date_field__lte=end_date)
                                      .distinct() )
        
        if (len(grouped_by) == 0):
            # detailed fields
            custom_fields = ["run_name", "lane", "project"]
            ordering_fields = ["time_window", "date_field"]
            ordering_fields.extend(custom_fields)
            detailed_fields = ["time_window"]
            detailed_fields.extend(MetricField.objects.filter(report__name=name).values_list("name", flat=True))
            queryset = queryset.values(*detailed_fields)
            queryset = queryset.order_by(*ordering_fields)
        else:
            # grouping definition
            extended_grouped_by = ["time_window"]
            extended_grouped_by.extend(grouped_by)
            queryset = queryset.values(*extended_grouped_by)
            # aggregated fields
            aggregate_fields = MetricField.objects.filter(report__name=name).filter(aggregation__isnull=False).values_list("name", "aggregation")
            for name, aggregation in aggregate_fields:
                aggregate = None
                match aggregation:
                    case AggregationType.COUNT:
                        aggregate = Count(F(name), distinct=True)
                    case AggregationType.SUM:
                        aggregate = Sum(F(name))
                    case AggregationType.MAX:
                        aggregate = Max(F(name))
                    case AggregationType.MIN:
                        aggregate = Min(F(name))
                annotation = { f"{name}_count": aggregate}
                queryset = queryset.annotate(**annotation)
                queryset = queryset.order_by(*extended_grouped_by)
    else:
        queryset = None

    return queryset