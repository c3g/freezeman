from fms_core.models import SampleIdentity

from django.db import transaction
from django.http import HttpResponseBadRequest
import fms_core.services.sample_identity as service
from fms_core.serializers import SampleIdentitySerializer

from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action

from ._utils import _list_keys
from ._constants import _sample_identity_filterset_fields

class SampleIdentityViewSet(viewsets.ModelViewSet):
    queryset = SampleIdentity.objects.select_related("biosample").all().distinct()
    serializer_class = SampleIdentitySerializer
    ordering_fields = (
        *_list_keys(_sample_identity_filterset_fields),
    )

    filterset_fields = {
        **_sample_identity_filterset_fields
    }
    ordering = ["id"]

    @transaction.atomic
    @action(detail=False, methods=["post"])
    def submit_identity_testing_report(self, request, *args, **kwargs):
        data = request.data
        replace = request.POST.get("replace", False)
        identities, errors, _ = service.ingest_identity_testing_report(data, replace)
        if errors:
            transaction.set_rollback(True)
            return HttpResponseBadRequest("\n".join(errors))
        else:
            return Response(self.get_serializer(identities.values(), many=True).data)