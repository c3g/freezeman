from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action

from fms_core.models.readset import Readset
from fms_core.serializers import ReadsetSerializer, ReadsetWithMetricsSerializer
from fms_core.models._constants import ReleaseStatus, ValidationStatus

from ._utils import _list_keys
from ._constants import _readset_filterset_fields

class ReadsetViewSet(viewsets.ModelViewSet):
    queryset = Readset.objects.all()

    serializer_class = ReadsetSerializer

    ordering_fields = (
        *_list_keys(_readset_filterset_fields),
    )

    filterset_fields = {
        **_readset_filterset_fields
    }

    def get_serializer_class(self):
        with_metrics = self.request.query_params.get("withMetrics", False)
        if(with_metrics):
            return ReadsetWithMetricsSerializer
        return ReadsetSerializer
    
    @action(detail=False, methods=["post"])
    def set_release_status(self, request, *args, **kwargs):
        data = request.data
        try:
            release_status = data.get("release_status")
            if release_status is not None:
                data["release_status_timestamp"] = timezone.now()
            readset_to_update = Readset.objects.select_for_update().get(pk=data['id'], validation_status=ValidationStatus.PASSED)
            readset_to_update.__dict__.update(data)
        except Exception as err:
            raise ValidationError(dict(non_field_errors=err))
        try:

            serializer = ReadsetSerializer(readset_to_update)
            readset_to_update.save()
        except Exception as err:
            raise ValidationError(err)

        return Response(serializer.data)
