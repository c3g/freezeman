import os
import json
from io import BytesIO

from openpyxl.reader.excel import load_workbook

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.conf import settings
from django.http import HttpResponseBadRequest, HttpResponse

from fms_core.models import ImportedFile


class ImportedFileViewSet(viewsets.ModelViewSet):
    queryset = ImportedFile.objects.all()
    serializer_class = None
    pagination_class = None
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def get_template(self, request):
        """
        Returns the imported template file identified by the provided ID.

        Args:
            request: Contains the ID to filter the right entry in imported_file.

        Returns:
            Byte stream file. Typically either an excel or csv template file.
        """
        print("Patate")
        template_id = request.GET.get("template")

        queryset = self.filter_queryset(self.get_queryset())
        try:
            filename = queryset.get("filename", None)
            print(filename)
            template_path = os.path.join(settings.TEMPLATE_UPLOAD_PATH, filename)
        
            imported_template = BytesIO()

            workbook = load_workbook(filename=template_path)
            workbook.save(imported_template)
        except Exception as err:
            return HttpResponseBadRequest(json.dumps({"detail": str(err)}), content_type="application/json")
        
        try:
            response = HttpResponse(content=imported_template.getvalue())
            response["Content-Type"] = "application/ms-excel"
            response["Content-Disposition"] = "attachment; filename=" + filename
        except Exception as err:
            return HttpResponseBadRequest(json.dumps({"detail": f"Failure to attach the template file to the response."}), content_type="application/json")
        
        return response