from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.contrib.auth.models import User
from django.http import QueryDict

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    AVAILABLE_REPORTS = ["production_report"]

    REPORT_INFORMATION = {
        "production_report": {
            "groups": ["library_type","project","taxon","technology"],  # Add technology_detailed once the rest is working
            "time_aggregation": ["daily", "weekly", "monthly"],
        },
    }

    def list(self, request):
        """
            Provides the list of existing reports by name.
        """
        return Response(self.AVAILABLE_REPORTS)
    
    @action(details=False, methods=["get"])
    def report(self, request):
        """
            Produce a report with given parameters or provide guidance for the required parameters.
        """
        params = QueryDict(request.META.get("QUERY_STRING"))
        name = params.get("name", None)
        group_list = params.get("group_by")
        start_date = params.get("start_date", None)
        end_date = params.get("end_date", None)

        if name is not None:
            if start_date is None or end_date is None:
                # Provide information about the requested report if no start_date and end_date provided
                report_information = self.REPORT_INFORMATION.get(name, f"Requested report does not exist.")
                return Response(report_information)
            
            