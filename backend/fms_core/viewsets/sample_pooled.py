from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.exceptions import APIException
from fms_core.models import Biosample, DerivedSample, DerivedBySample, Index, Library, LibraryType, SampleKind, Sample
from fms_core.filters import PooledSampleFilter

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
    parent_sample_name=serializers.SerializerMethodField()
    parent_sample_id = serializers.SerializerMethodField()
    class Meta:
        model = DerivedBySample
        exclude = EXCLUDE_BOOKKEEPING + ['sample']

    # Finds the id of the parent sample from which this pooled sample was derived. For example, if this
    # pool member is from a library then it returns the id of the library sample. 
    def get_parent_sample_id(self, obj):
        parent_sample = Sample.objects.get(parent_of=obj.sample.id, derived_samples=obj.derived_sample.id)
        return parent_sample.id if parent_sample is not None else ''

    # Finds the id of the parent sample from which this pooled sample was derived.
    def get_parent_sample_name(self, obj):
        sample = Sample.objects.get(parent_of=obj.sample.id, derived_samples=obj.derived_sample.id)
        return sample.name if sample is not None else ''


class MissingPoolIDException(APIException):
    status_code = 400
    default_code = 'bad_request'
    default_detail = 'No pool ID: query must include sample__id parameter containing the pool ID.'

class PooledSamplesViewSet(viewsets.ModelViewSet):
    queryset = DerivedBySample.objects.all()
    serializer_class = PooledSampleSerializer
    filter_class = PooledSampleFilter

    def get_queryset(self):
        # Ensure that the pool id is specified to avoid trying to return all of the derived
        # samples in the db...
        sample_id = self.request.query_params.get('sample__id__in')
        if (sample_id is None):
            raise MissingPoolIDException()
        queryset = DerivedBySample.objects.all().filter(sample_id=sample_id)
        return queryset
        


