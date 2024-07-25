from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from django.http import HttpResponseServerError, HttpResponse

from fms_core.services.samplesheet import get_samplesheet, SAMPLESHEET_FILE_PATH

import json
import datetime

class SamplesheetViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def get_samplesheet(self, _request):
        """
        Generates a samplesheet with the placement information received in the request.

        request contains a body with a json object structure as follows:
            {"placement": [{"coordinates": "A01", "sample_id": 140123},
                           {"coordinates": "B01", "sample_id": 404123},
                           ...],
             "container_barcode": "IAMABARCODE",
             "container_kind": "flowcell_whatchamacallit"
            }
        
        Args:
          None

        Returns:
          response with samplesheet as attachment.
        """
        body = json.loads(_request.body)
        samplesheet, errors, _ = get_samplesheet(body["container_kind"], body["placement"])
        if errors:
            response = HttpResponseServerError("\n".join(errors))
        else:
            try:
                response = HttpResponse(content=samplesheet)
                response["Content-Type"] = "application/ms-excel"
                response["Content-Disposition"] = "attachment; filename=Samplesheet_v2_" + body["container_barcode"] + "_" + datetime.datetime.now().strftime("%Y-%m-%d") + ".xlsx"
            except Exception as err:
                return HttpResponseServerError(json.dumps({"detail": f"Failure to attach the samplesheet to the response."}), content_type="application/json")
        return response