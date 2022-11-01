from django.db.models import BooleanField, When, Count, Case, Subquery, OuterRef
from rest_framework import viewsets
from fms_core.models import DerivedBySample, Sample
from ._constants import (
    _pooled_sample_filterset_fields,
)
from ._utils import _list_keys
from fms_core.serializers import PooledSampleSerializer
from fms_core.filters import PooledSamplesFilter        

class PooledSamplesViewSet(viewsets.ModelViewSet):
    '''
        Lists the samples that are contained in a pool. This is a custom endpoint designed
        for the frontend to display pooled samples in a table. It returns the list of derived
        samples contained in a single pool.

        The request must include a 'sampled__id__in` query parameter specifying the id of the
        pool sample.
    '''
    queryset = DerivedBySample.objects.all()

    # Limit queries to DerivedBySamples that are in a pooled parent sample,
    # ie. a parent sample that contains more than one derived sample.

    queryset = queryset.annotate(
        count_derived_samples=Count('sample__derived_samples')
    )

    queryset = queryset.annotate(is_pooled=Case(
        When(count_derived_samples__gt=1, then=True),
        default=False,
        output_field=BooleanField()
    )).distinct()
    queryset = queryset.filter(is_pooled=True)

    queryset = queryset.annotate(
        parent_sample_name=Subquery(
            DerivedBySample.objects
            .filter(sample__parent_of=OuterRef("sample"))
            .filter(derived_sample=OuterRef("derived_sample"))
            .values_list("sample__name", flat=True)[:1]
        )
    )

    serializer_class = PooledSampleSerializer
    filterset_fields = _pooled_sample_filterset_fields
    ordering_fields = {
        *_list_keys(_pooled_sample_filterset_fields),
        "parent_sample_name"
    }
    filter_class = PooledSamplesFilter