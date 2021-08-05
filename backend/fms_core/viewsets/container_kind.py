from django.http import HttpResponseNotFound

from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

import json

from fms_core.containers import ContainerSpec, CONTAINER_KIND_SPECS


# noinspection PyMethodMayBeStatic,PyUnusedLocal
class ContainerKindViewSet(viewsets.ViewSet):
    pagination_class = None
    permission_classes = [AllowAny]

    def list(self, request):
        return Response(data=[s.serialize() for s in ContainerSpec.container_specs])

    def retrieve(self, request, pk=None):
        if pk in CONTAINER_KIND_SPECS:
            return Response(data=CONTAINER_KIND_SPECS[pk].serialize())
        return HttpResponseNotFound(json.dumps({"detail": f"Could not find container kind '{pk}'"}),
                                    content_type="application/json")
