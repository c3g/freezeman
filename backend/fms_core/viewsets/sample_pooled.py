from rest_framework import viewsets, serializers
from rest_framework.exceptions import APIException
from fms_core.models import DerivedBySample, Sample
from fms_core.filters import PooledSampleFilter

        
class PooledSampleSerializer(serializers.Serializer):
    ''' Serializes a DerivedBySample object, representing a pooled sample. 
        The result is a nested data structure containing all of the information about the
        pooled sample needed by the frontend for display.
    '''
    # Since DerivedBySample doesn't have its own id field, we use the derived_sample id
    # as a top level id in the returned data structure. The UX needs this for 'objectsById' stuff.
    id = serializers.IntegerField(read_only = True, source='derived_sample.id')

    volume_ratio = serializers.DecimalField(max_digits=20, decimal_places=3, read_only=True)

    # Associated project info
    project_id = serializers.IntegerField(read_only=True, source='derived_sample.project.id')
    project_name = serializers.CharField(read_only=True, source='derived_sample.project.name')
    
    # Sample info
    alias = serializers.CharField(read_only=True, source='derived_sample.biosample.alias')
    collection_site = serializers.CharField(read_only=True, source='derived_sample.biosample.collection_site')
    experimental_group = serializers.JSONField(read_only=True, source='derived_sample.experimental_group')
    individual_id = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.id')
    individual_name = serializers.CharField(read_only=True, source='derived_sample.biosample.individual_name')
    parent_sample_id = serializers.SerializerMethodField(read_only=True)
    parent_sample_name = serializers.SerializerMethodField(read_only=True)
    sample_kind = serializers.CharField(read_only=True, source='derived_sample.sample_kind.name')

    # Library info
    index = serializers.CharField(read_only=True, source='derived_sample.library.index.name')
    index_id = serializers.CharField(read_only=True, source='derived_sample.library.index.id')
    index_set = serializers.CharField(read_only=True, source='derived_sample.library.index.index_set.name')
    library_size = serializers.DecimalField(read_only=True, max_digits=20, decimal_places=0, source='derived_sample.library.size')
    library_type = serializers.CharField(read_only=True, source='derived_sample.library.library_type')
    platform = serializers.CharField(read_only=True, source='derived_sample.library.platform')
    strandedness = serializers.CharField(read_only=True, source='derived_sample.library.strandedness')

    class Meta:
        model = DerivedBySample
        fields = [
            'alias', 
            'collection_site',
            'experimental_group',
            'id', 
            'index_id',
            'index_set',
            'index',
            'individual_id',
            'individual_name',
            'library_size',
            'library_type', 
            'parent_sample_id', 
            'parent_sample_name', 
            'platform',
            'project_id', 
            'project_name', 
            'sample_kind'
            'strandedness',
            'volume_ratio', 
            ]

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
    '''
        Lists the samples that are contained in a pool. This is a custom endpoint designed
        for the frontend to display pooled samples in a table. It returns the list of derived
        samples contained in a single pool.

        The request must include a 'sampled__id__in` query parameter specifying the id of the
        pool sample. If not, MissingPoolIDException is raised.
    '''
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
        


