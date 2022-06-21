import os
import json
import mimetypes

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.conf import settings
from django.http import HttpResponseBadRequest, HttpResponse

from fms_core.models import ImportedFile
from fms_core.serializers import ImportedFileSerializer

from ._constants import _imported_file_filterset_fields


class ImportedFileViewSet(viewsets.ModelViewSet):
    queryset = ImportedFile.objects.all()
    serializer_class = ImportedFileSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_imported_file_filterset_fields,
    }

    @action(detail=True, methods=["get"])
    def download(self, _request, pk) -> Response:
        """
        Returns the imported template file identified by the provided ID.

        Args:
            _request: Contains the ID to filter the right entry in imported_file.

        Returns:
            Byte stream file. Typically either an excel or csv template file.
        """
        queryset = self.get_queryset().filter(id=pk)
        filename = queryset.first().filename
        file_path = os.path.join(settings.TEMPLATE_UPLOAD_PATH, filename)
        mime_type_guess = mimetypes.guess_type(file_path)
        
        try:
            with open(file_path, "rb") as file:
                response = HttpResponse(content=file)
                response["Content-Type"] = mime_type_guess[0]
                response["Content-Disposition"] = "attachment; filename=" + filename
        except Exception as err:
            print(err)
            return HttpResponseBadRequest(json.dumps({"detail": f"Failure to attach the template file to the response."}), content_type="application/json")
        
        return response