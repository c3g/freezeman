import json
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.models import Dataset, DatasetFile

class DatasetViewSet(viewsets.ViewSet):
    def create(self, request, *args, **kwargs):
        data = request.data
        run_name = data["run"]
        lane = data["lane"]

        # projects
        projects = data["run_validation"]

        # sample names
        for project in list(projects):
            for readset in data["readsets"]:
                if readset["sample__name"] in project["sample"]:
                    project["sample__name"] = readset["sample__name"]
        
        
        