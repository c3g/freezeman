from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.contrib.auth.models import User
from django.http import QueryDict, HttpResponseServerError, HttpResponseBadRequest, HttpResponse

from ..services.report import list_reports, list_report_information, get_report, get_report_as_excel, TimeWindow

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        return Response(list_reports())

    def retrieve(self, request, pk=None):
        """
            Produce a report with given parameters or provide guidance for the required parameters.
        """
        response = None
        params = QueryDict(request.META.get("QUERY_STRING"))
        report_name = pk
        grouped_by = params.getlist("group_by", [])
        time_window_label = params.get("time_window", None)
        start_date = params.get("start_date", None)
        end_date = params.get("end_date", None)
        export = params.get("export", None)
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

        if report_name is None:
            return Response(list_reports())
        else:
            if start_date is None or end_date is None:
                # Provide information about the requested report if no start_date and end_date provided
                return Response(list_report_information(report_name))
            
            report_data = get_report(report_name=report_name,
                                     grouped_by=grouped_by,
                                     time_window=time_window,
                                     start_date=start_date,
                                     end_date=end_date)
            if export is not None:
                excel_report = get_report_as_excel(report_data)
                response = HttpResponse(content=excel_report)
                response["Content-Type"] = "application/ms-excel"
                response["Content-Disposition"] = f"attachment; filename={report_data.get('name', 'Report')}_{report_data.get('time_window', '')}_{report_data.get('start_date', '')}_{report_data.get('end_date', '')}.xlsx"
            else:
                response = Response(report_data)
            return response