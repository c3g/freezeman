from django.core.exceptions import ValidationError
from django.utils import timezone
from django.http import HttpResponseBadRequest
from fms_core.filters import ReadsetFilter
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Subquery, OuterRef
from fms_core.models.metric import Metric
from fms_core.models.readset import Readset
from fms_core.serializers import ReadsetSerializer, ReadsetWithMetricsSerializer
from fms_core.models._constants import ValidationStatus

from ._utils import _list_keys
from ._constants import _readset_filterset_fields

class ReadsetViewSet(viewsets.ModelViewSet):
    queryset = Readset.objects.all()
    queryset = queryset.annotate(
        number_reads = Subquery(
            Metric.objects
            .filter(readset=OuterRef("pk"), name="nb_reads").values('value_numeric')[:1]
        )
    )

    ordering_fields = (
        *_list_keys(_readset_filterset_fields),
        "number_reads"
    )

    filterset_fields = {
        **_readset_filterset_fields
    }
    ordering = ["id"]

    filterset_class = ReadsetFilter

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
            
            readset_to_update = Readset.objects.filter(pk=data['id']).exclude(validation_status=ValidationStatus.AVAILABLE)
            if not readset_to_update.exists():
                return HttpResponseBadRequest(f"Run must first be validated before release status can be changed.")
            
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
