from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from fms_core.models import Biosample, DerivedSample, DerivedBySample, Index, Library, LibraryType, SampleKind


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

class PooledSampleSerializer(serializers.Serializer):
    volume_ratio = serializers.DecimalField(max_digits=20, decimal_places=3, read_only=True)
    derived_sample = DerivedSampleSerializer()




class PooledSamplesViewSet(viewsets.ModelViewSet):
    queryset = DerivedBySample.objects.all()
    queryset = queryset.select_related('derived_sample')
    serializer_class = PooledSampleSerializer

    def get_queryset(self):
        return self.queryset
        

    @action(detail=False, methods=["get"])
    def list_pooled_samples(self, request):
        pool_id = request.GET.get('pool_id')

        # Get the DerivedBySample objects associated with the pool (sample) id.
        derived_by_samples = self.get_queryset().filter(sample_id=pool_id)

        return Response(PooledSampleSerializer(derived_by_samples, many=True).data)    
