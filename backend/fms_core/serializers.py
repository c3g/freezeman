from django.contrib.auth.models import User, Group
from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers
from reversion.models import Version, Revision

from .models import (
    Container,
    ExperimentRun,
    ExperimentType,
    Individual,
    Instrument,
    PropertyValue,
    Protocol,
    Process,
    ProcessMeasurement,
    Sample,
    SampleKind,
    Project,
    SampleByProject,
)


__all__ = [
    "ContainerSerializer",
    "ContainerExportSerializer",
    "ExperimentRunSerializer",
    "ExperimentRunExportSerializer",
    "ExperimentTypeSerializer",
    "SimpleContainerSerializer",
    "IndividualSerializer",
    "InstrumentSerializer",
    "SampleKindSerializer",
    "PropertyValueSerializer",
    "ProcessSerializer",
    "ProcessMeasurementSerializer",
    "ProcessMeasurementExportSerializer",
    "ProtocolSerializer",
    "SampleSerializer",
    "SampleExportSerializer",
    "NestedSampleSerializer",
    "VersionSerializer",
    "RevisionSerializer",
    "UserSerializer",
    "GroupSerializer",
    "ProjectSerializer",
    "ProjectExportSerializer",
]


class ContainerSerializer(serializers.ModelSerializer):
    children = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    samples = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    experiment_run = serializers.PrimaryKeyRelatedField(many=False, read_only=True)

    class Meta:
        model = Container
        fields = "__all__"
        extra_fields = ('experiment_run')


class SimpleContainerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Container
        fields = "__all__"


class ContainerExportSerializer(serializers.ModelSerializer):
    location = serializers.SlugRelatedField(slug_field='barcode', read_only=True)
    container_kind = serializers.CharField(source='kind')

    class Meta:
        model = Container
        fields = ('name', 'container_kind', 'barcode', 'location', 'coordinates', 'comment')


class ExperimentRunSerializer(serializers.ModelSerializer):
    children_processes = serializers.SerializerMethodField()
    instrument_type = serializers.SerializerMethodField()
    platform = serializers.SerializerMethodField()

    class Meta:
        model = ExperimentRun
        fields = "__all__"
        extra_fields = ('children_processes', 'instrument_type', 'platform')

    def get_children_processes(self, obj):
        return Process.objects.filter(parent_process=obj.process).values_list('id', flat=True)

    def get_instrument_type(self, obj):
        return obj.instrument.type.type

    def get_platform(self, obj):
        return obj.instrument.type.platform.name

class ExperimentRunExportSerializer(serializers.ModelSerializer):
    experiment_type = serializers.CharField(read_only=True, source="experiment_type.workflow")
    instrument = serializers.CharField(read_only=True, source="instrument.name")
    container_kind = serializers.CharField(read_only=True, source="container.kind")
    container_name = serializers.CharField(read_only=True, source="container.name")
    container_barcode = serializers.CharField(read_only=True, source="container.barcode")

    class Meta:
        model = ExperimentRun
        fields = ('experiment_type', 'instrument', 'container_kind', 'container_name', 'container_barcode', 'start_date')


class ExperimentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExperimentType
        fields = "__all__"

class IndividualSerializer(serializers.ModelSerializer):
    class Meta:
        model = Individual
        fields = "__all__"

class InstrumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instrument
        fields = "__all__"


class SampleKindSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleKind
        fields = "__all__"

class ProtocolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Protocol
        fields = "__all__"

class ProcessSerializer(serializers.ModelSerializer):
    children_properties = serializers.SerializerMethodField()

    class Meta:
        model = Process
        fields = "__all__"
        extra_fields = ('children_processes')


    def get_children_properties(self, obj):
        process_content_type = ContentType.objects.get_for_model(Process)
        return PropertyValue.objects.filter(object_id=obj.id, content_type=process_content_type).values_list('id', flat=True)

class ProcessMeasurementSerializer(serializers.ModelSerializer):
    protocol = serializers.IntegerField(read_only=True, source="process.protocol.id")
    child_sample = serializers.IntegerField(read_only=True)

    class Meta:
      model = ProcessMeasurement
      fields = "__all__"
      extra_fields = ('protocol', 'child_sample')

class ProcessMeasurementExportSerializer(serializers.ModelSerializer):
    process_measurement_id = serializers.IntegerField(read_only=True, source="id")
    protocol_name = serializers.CharField(read_only=True, source="process.protocol.name")
    child_sample_name = serializers.CharField(read_only=True)
    source_sample_name = serializers.CharField(read_only=True)

    class Meta:
      model = ProcessMeasurement
      fields = ('process_measurement_id', 'process_id', 'protocol_name', 'source_sample_name', 'child_sample_name', 'volume_used', 'execution_date', 'comment')

class PropertyValueSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(read_only=True, source="property_type.name")

    class Meta:
      model = PropertyValue
      fields = "__all__"
      extra_fields = ('property_name')

class SampleSerializer(serializers.ModelSerializer):
    extracted_from = serializers.SerializerMethodField()
    process_measurements = serializers.PrimaryKeyRelatedField(source='process_measurement', many=True, read_only=True)
    projects = serializers.PrimaryKeyRelatedField(read_only=True, many=True)

    class Meta:
        model = Sample
        fields = "__all__"
        extra_fields = ('extracted_from', 'projects')

    def get_extracted_from(self, obj):
        if obj.extracted_from is None:
            return None
        else:
            return obj.extracted_from.id

class SampleExportSerializer(serializers.ModelSerializer):
    sample_id = serializers.IntegerField(read_only=True, source="id")
    sample_kind = serializers.CharField(read_only=True, source="sample_kind.name")
    sample_name = serializers.CharField(source="name")
    individual_id = serializers.CharField(read_only=True, source="individual.name")
    taxon = serializers.CharField(read_only=True, source="individual.taxon")
    sex = serializers.CharField(read_only=True, source="individual.sex")
    pedigree = serializers.CharField(read_only=True, source="individual.pedigree")
    cohort = serializers.CharField(read_only=True, source="individual.cohort")
    mother_name = serializers.SerializerMethodField()
    father_name = serializers.SerializerMethodField()
    container_kind = serializers.CharField(read_only=True, source="container.kind")
    container_name = serializers.CharField(read_only=True, source="container.name")
    container_barcode = serializers.CharField(read_only=True, source="container.barcode")
    location_coord = serializers.CharField(read_only=True, source="container.coordinates")
    location_barcode = serializers.SerializerMethodField()
    current_volume = serializers.SerializerMethodField()
    projects = serializers.PrimaryKeyRelatedField(read_only=True, many=True)

    class Meta:
        model = Sample
        fields = ('sample_id','sample_kind', 'sample_name', 'alias', 'cohort', 'taxon',
                  'container_kind', 'container_name', 'container_barcode', 'location_barcode', 'location_coord',
                  'individual_id', 'sex', 'pedigree', 'mother_name', 'father_name',
                  'current_volume', 'concentration', 'collection_site', 'tissue_source', 'creation_date', 'phenotype',
                  'depleted', 'coordinates', 'projects', 'comment' )

    def get_location_barcode(self, obj):
        if obj.container.location is None:
            return ''
        else:
            return obj.container.location.barcode

    def get_current_volume(self, obj):
        return obj.volume

    def get_father_name(self, obj):
        father = '' if obj.individual.father is None else obj.individual.father.name
        return father

    def get_mother_name(self, obj):
        mother = '' if obj.individual.mother is None else obj.individual.mother.name
        return mother


class NestedSampleSerializer(serializers.ModelSerializer):
    # Serialize foreign keys' objects; don't allow posting new objects (rather accept foreign keys)
    individual = IndividualSerializer(read_only=True)
    container = SimpleContainerSerializer(read_only=True)

    class Meta:
        model = Sample
        fields = "__all__"


class VersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Version
        fields = "__all__"
        depth = 1


class RevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Revision
        fields = "__all__"


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "password", "first_name", "last_name", "email", "groups", "is_staff", "is_superuser", "date_joined")
        extra_kwargs = {
            "password": {"write_only": True}
        }

    def create(self, validated_data):
        user = super(UserSerializer, self).create(validated_data)
        user.set_password(validated_data['password'])
        user.save()
        return user

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ("id", "name", "permissions")
        depth = 1

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        exclude = ("samples",)

class ProjectExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ("id", "name", "principal_investigator", "requestor_name", "requestor_email", "status", "targeted_end_date",  "comment")
