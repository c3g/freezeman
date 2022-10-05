from rest_framework import viewsets, serializers
from rest_framework.exceptions import APIException
from fms_core.models import DerivedBySample, Sample
from ._constants import (
    _pooled_sample_filterset_fields,
)
from ._utils import _list_keys
from fms_core.serializers import PooledSampleSerializer
        

class PooledSamplesViewSet(viewsets.ModelViewSet):
    '''
        Lists the samples that are contained in a pool. This is a custom endpoint designed
        for the frontend to display pooled samples in a table. It returns the list of derived
        samples contained in a single pool.

        The request must include a 'sampled__id__in` query parameter specifying the id of the
        pool sample.
    '''
    queryset = DerivedBySample.objects.all()
    serializer_class = PooledSampleSerializer
    filterset_fields = _pooled_sample_filterset_fields
    ordering_fields = {
        *_list_keys(_pooled_sample_filterset_fields),
    }

