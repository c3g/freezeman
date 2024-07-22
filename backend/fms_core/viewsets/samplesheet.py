from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from django.http import HttpResponseServerError, HttpResponse

from fms_core.services.samplesheet import get_samplesheet, SAMPLESHEET_FILE_PATH

import json
import datetime

class SamplesheetViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["get"])
    def get_samplesheet(self, _request, pk=None):
        """
        Generates a samplesheet with the placement information received in the request.

        request contains placement object structure as follows:
            {"placement": [{"coordinates": "A01", "sample": "140123"},
                           {"coordinates": "B01", "sample": "404123"},
                           ...]
            }
        
        Args:
          None

        Returns:
            On success:
            {'ok': True, 'data': <the run info>}

            On error:
            {'ok': False, 'message': <the error message>}
        """

        info = json.loads(_request.GET.get("placement"))
        samplesheet, errors, _ = get_samplesheet(info["placement"])
        if errors:
            response = HttpResponseServerError("\n".join(errors))
        else:
            try:
                response = HttpResponse(content=samplesheet)
                response["Content-Type"] = "application/ms-excel"
                response["Content-Disposition"] = "attachment; filename=Samplesheet_v2_" + datetime.datetime.now() + ".xlsx"
            except Exception as err:
                return HttpResponseServerError(json.dumps({"detail": f"Failure to attach the samplesheet to the response."}), content_type="application/json")
        return response