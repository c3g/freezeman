from django.contrib.auth.models import User
from rest_framework import serializers
from reversion.models import Version

from .models import Container, Sample, Individual


__all__ = [
    "ContainerSerializer",
    "ContainerExportSerializer",
    "SimpleContainerSerializer",
    "IndividualSerializer",
    "SampleSerializer",
    "SampleExportSerializer",
    "NestedSampleSerializer",
    "VersionSerializer",
    "UserSerializer",
]


class ContainerSerializer(serializers.ModelSerializer):
    children = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    samples = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Container
        fields = "__all__"


class SimpleContainerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Container
        fields = "__all__"


class ContainerExportSerializer(serializers.ModelSerializer):
    location = serializers.SlugRelatedField(slug_field='barcode', read_only=True)

    class Meta:
        model = Container
        fields = ('kind', 'name', 'barcode', 'location', 'coordinates', 'comment')


class IndividualSerializer(serializers.ModelSerializer):
    class Meta:
        model = Individual
        fields = "__all__"


class SampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sample
        fields = "__all__"


class SampleExportSerializer(serializers.ModelSerializer):
    individual_id = serializers.CharField(read_only=True, source="individual.label")
    taxon = serializers.CharField(read_only=True, source="individual.taxon")
    sex = serializers.CharField(read_only=True, source="individual.sex")
    pedigree = serializers.CharField(read_only=True, source="individual.pedigree")
    cohort = serializers.CharField(read_only=True, source="individual.cohort")
    mother_label = serializers.SerializerMethodField()
    father_label = serializers.SerializerMethodField()
    container_kind = serializers.CharField(read_only=True, source="container.kind")
    container_name = serializers.CharField(read_only=True, source="container.name")
    container_barcode = serializers.CharField(read_only=True, source="container.barcode")
    container_coordinates = serializers.CharField(read_only=True, source="container.coordinates")
    location_barcode = serializers.SerializerMethodField()
    last_volume_history = serializers.SerializerMethodField()

    class Meta:
        model = Sample
        fields = ('biospecimen_type', 'name', 'alias', 'concentration', 'depleted', 'collection_site', 'tissue_source',
                  'reception_date', 'phenotype', 'comment', 'coordinates', 'last_volume_history',
                  'individual_id', 'taxon', 'sex', 'pedigree', 'mother_label', 'father_label', 'cohort',
                  'container_kind', 'container_name', 'container_barcode', 'container_coordinates', 'location_barcode')

    def get_location_barcode(self, obj):
        if obj.container.location is None:
            return ''
        else:
            return obj.container.location.barcode

    def get_last_volume_history(self, obj):
        sorted_volume_histories = sorted(obj.volume_history, key=lambda k: k['date'])
        return sorted_volume_histories[-1]['volume_value']

    def get_father_label(self, obj):
        father = '' if obj.individual.father is None else obj.individual.father.label
        return father

    def get_mother_label(self, obj):
        mother = '' if obj.individual.mother is None else obj.individual.mother.label
        return mother


class NestedSampleSerializer(serializers.ModelSerializer):
    # Serialize foreign keys' objects; don't allow posting new objects (rather accept foreign keys)
    individual = IndividualSerializer(read_only=True)
    container = SimpleContainerSerializer(read_only=True)
    extracted_from = SampleSerializer(read_only=True)

    class Meta:
        model = Sample
        fields = "__all__"


class VersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Version
        fields = "__all__"
        depth = 1


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "groups", "is_staff", "is_superuser", "date_joined")
        depth = 1
