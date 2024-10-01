from django.core.exceptions import ValidationError
from django.utils import timezone
from django.http import HttpResponseBadRequest
from fms_core.filters import ReadsetFilter
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Subquery, OuterRef, Q
from fms_core.models import Metric, Readset
from fms_core.serializers import ReadsetSerializer, ReadsetWithMetricsSerializer
from fms_core.models._constants import ValidationStatus

from ._utils import _list_keys
from ._constants import _readset_filterset_fields

class ReadsetViewSet(viewsets.ModelViewSet):
    queryset = Readset.objects.select_related("dataset").select_related("dataset__experiment_run").all().distinct()
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

