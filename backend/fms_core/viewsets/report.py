from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.contrib.auth.models import User
from django.http import QueryDict

from ..services.report import AVAILABLE_REPORTS, REPORT_INFORMATION, get_report

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
            Provides the list of existing reports by name.
        """
        return Response(AVAILABLE_REPORTS)
    
    @action(detail=False, methods=["get"])
    def report(self, request):
        """
            Produce a report with given parameters or provide guidance for the required parameters.
        """
        params = QueryDict(request.META.get("QUERY_STRING"))
        name = params.get("name", None)
        grouped_by = params.getlist("group_by", [])
        time_aggregation = params.get("time_aggregation", None)
        start_date = params.get("start_date", None)
        end_date = params.get("end_date", None)

        if name is not None:
            if start_date is None or end_date is None:
                # Provide information about the requested report if no start_date and end_date provided
                report_information = REPORT_INFORMATION.get(name, f"Requested report does not exist.")
                return Response(report_information)
            
            report_data, errors, warnings = get_report(name=name,
                                                       grouped_by=grouped_by,
                                                       time_aggregation=time_aggregation,
                                                       start_date=start_date,
                                                       end_date=end_date)
            return Response(report_data)