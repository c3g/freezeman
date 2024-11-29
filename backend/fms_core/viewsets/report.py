from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.contrib.auth.models import User
from django.http import QueryDict

from ..services.report import list_reports, list_report_information, get_report, TimeWindow

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """
            Produce a report with given parameters or provide guidance for the required parameters.
        """
        params = QueryDict(request.META.get("QUERY_STRING"))
        name = params.get("name", None)
        grouped_by = params.getlist("group_by", [])
        time_window_label = params.get("time_window", None)
        start_date = params.get("start_date", None)
        end_date = params.get("end_date", None)
        # Use time window text choices
        match time_window_label:
            case TimeWindow.MONTHLY.label:
                time_window = TimeWindow.MONTHLY
            case TimeWindow.WEEKLY.label:
                time_window = TimeWindow.WEEKLY
            case TimeWindow.DAILY.label:
                time_window = TimeWindow.DAILY
            case _:
                time_window = TimeWindow.MONTHLY

        if name is None:
            return Response(list_reports())
        else:
            if start_date is None or end_date is None:
                # Provide information about the requested report if no start_date and end_date provided
                return Response(list_report_information(name))
            
            report_data = get_report(name=name,
                                     grouped_by=grouped_by,
                                     time_window=time_window,
                                     start_date=start_date,
                                     end_date=end_date)
            return Response(report_data)