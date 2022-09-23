from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.exceptions import APIException
from fms_core.models import Biosample, DerivedSample, DerivedBySample, Index, Library, LibraryType, SampleKind


# Custom serializers
# These serializers serialize the data we want to receive in pool samples.

EXCLUDE_BOOKKEEPING = ['created_at', 'updated_at', 'created_by', 'updated_by', 'deleted']

class IndexSerializer(serializers.ModelSerializer):
        index_set = serializers.CharField(read_only=True, source="index_set.name")
        index_structure = serializers.CharField(read_only=True, source="index_structure.name")
        class Meta:
            model = Index
            exclude = EXCLUDE_BOOKKEEPING

class SampleKindSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleKind
        fields = ['name', 'is_extracted']

class BiosampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Biosample
        exclude = EXCLUDE_BOOKKEEPING

class LibrarySerializer(serializers.ModelSerializer):
    library_type = serializers.CharField(read_only=True, source='library_type.name')
    platform = serializers.CharField(read_only=True, source='platform.name')
    index = IndexSerializer(read_only=True, required=False)
    class Meta:
        model = Library
        exclude = EXCLUDE_BOOKKEEPING
        depth = 1

class DerivedSampleSerializer(serializers.ModelSerializer):
    library = LibrarySerializer(required=False)
    biosample = BiosampleSerializer(required=False)
    tissue_source = SampleKindSerializer(required=False)
    sample_kind=SampleKindSerializer(required=False)
    class Meta:
        model = DerivedSample
        exclude = EXCLUDE_BOOKKEEPING
        depth = 1

# Serializes a DerivedBySample object
class PooledSampleSerializer(serializers.Serializer):
    volume_ratio = serializers.DecimalField(max_digits=20, decimal_places=3, read_only=True)
    derived_sample = DerivedSampleSerializer()
    # Since DerivedBySample doesn't have its own id field, we use the derived_sample id
    # as a top level id in the returned data structure. The UX needs this for 'objectsById' stuff.
    id = serializers.IntegerField(read_only = True, source='derived_sample.id')
    class Meta:
        model = DerivedBySample
        exclude = EXCLUDE_BOOKKEEPING + ['sample']


class MissingPoolIDException(APIException):
    status_code = 400
    default_code = 'bad_request'
    default_detail = 'pool_id query parameter is required'

class PooledSamplesViewSet(viewsets.ModelViewSet):
    queryset = DerivedBySample.objects.all()
    serializer_class = PooledSampleSerializer

    def get_queryset(self):
        pool_id = self.request.query_params.get('pool_id')
        # I'm not sure if this is the "django way" to force a query parameter to be
        # included in the request... Maybe the parameter should be part of the url instead
        # of a query parameter and the retrieve method should be used? But, how would
        # pagination work in that case?
        if (pool_id is None):
            raise MissingPoolIDException()
        queryset = DerivedBySample.objects.all().filter(sample_id=pool_id)
        return queryset
        


