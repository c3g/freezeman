from django.contrib.auth.models import User, Group
from typing import Dict, Any, Union, List
from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers
from reversion.models import Version, Revision
from fms_core.services.library import convert_library_concentration_from_ngbyul_to_nm
from django.db.models import Max

from .models import (
    Container,
    Dataset,
    DatasetFile,
    ExperimentRun,
    RunType,
    Index,
    IndexSet,
    Individual,
    Instrument,
    InstrumentType,
    LibraryType,
    Platform,
    PropertyValue,
    PropertyType,
    Protocol,
    Process,
    ProcessMeasurement,
    Project,
    Sample,
    SampleKind,
    SampleMetadata,
    Sequence,
    Taxon,
    ImportedFile
)

from .models._constants import ReleaseStatus


__all__ = [
    "ContainerSerializer",
    "ContainerExportSerializer",
    "DatasetSerializer",
    "DatasetFileSerializer",
    "ExperimentRunSerializer",
    "ExperimentRunExportSerializer",
    "RunTypeSerializer",
    "SimpleContainerSerializer",
    "IndexSerializer",
    "IndexSetSerializer",
    "IndexExportSerializer",
    "IndividualSerializer",
    "IndividualExportSerializer",
    "InstrumentSerializer",
    "InstrumentTypeSerializer",
    "LibrarySerializer",
    "LibraryTypeSerializer",
    "PlatformSerializer",
    "SampleKindSerializer",
    "PropertyTypeSerializer",
    "PropertyValueSerializer",
    "ProcessSerializer",
    "ProcessMeasurementSerializer",
    "ProcessMeasurementExportSerializer",
    "ProcessMeasurementWithPropertiesExportSerializer",
    "ProtocolSerializer",
    "SampleMetadataSerializer",
    "SampleSerializer",
    "SampleExportSerializer",
    "serialize_sample_export",
    "NestedSampleSerializer",
    "VersionSerializer",
    "RevisionSerializer",
    "UserSerializer",
    "GroupSerializer",
    "ProjectSerializer",
    "ProjectExportSerializer",
    "SequenceSerializer",
    "TaxonSerializer",
    "ImportedFileSerializer",
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
    children_containers_count = serializers.SerializerMethodField()
    samples_contained_count = serializers.SerializerMethodField()

    class Meta:
        model = Container
        fields = ('name', 'container_kind', 'barcode', 'location', 'coordinates', 'children_containers_count', 'samples_contained_count', 'comment')

    def get_children_containers_count(self, obj):
        return obj.children.all().count()
    
    def get_samples_contained_count(self, obj):
        return obj.samples.all().count()


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
    experiment_run_id = serializers.IntegerField(read_only=True, source="id")
    experiment_run_name = serializers.CharField(read_only=True, source="name")
    run_type = serializers.CharField(read_only=True, source="run_type.name")
    instrument = serializers.CharField(read_only=True, source="instrument.name")
    container_kind = serializers.CharField(read_only=True, source="container.kind")
    container_name = serializers.CharField(read_only=True, source="container.name")
    container_barcode = serializers.CharField(read_only=True, source="container.barcode")

    class Meta:
        model = ExperimentRun
        fields = ('experiment_run_id', 'experiment_run_name', 'run_type', 'instrument', 'container_kind', 'container_name', 'container_barcode', 'start_date')


class RunTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunType
        fields = "__all__"


class TaxonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Taxon
        fields = "__all__"


class IndividualSerializer(serializers.ModelSerializer):
    class Meta:
        model = Individual
        fields = "__all__"

class IndividualExportSerializer(serializers.ModelSerializer):
    individual_id = serializers.IntegerField(read_only=True, source="id")
    individual_name = serializers.CharField(read_only=True, source="name")
    mother_name = serializers.SerializerMethodField()
    father_name = serializers.SerializerMethodField()
    taxon_name = serializers.SerializerMethodField()
    taxon_ncbi_id = serializers.SerializerMethodField()

    class Meta:
        model = Individual
        fields = ("individual_id",
                  "individual_name",
                  "mother_name",
                  "father_name",
                  "pedigree",
                  "sex",
                  "cohort",
                  "taxon_name",
                  "taxon_ncbi_id",)
    
    def get_father_name(self, obj):
        father = '' if obj.father is None else obj.father.name
        return father

    def get_mother_name(self, obj):
        mother = '' if obj.mother is None else obj.mother.name
        return mother

    def get_taxon_name(self, obj):
        taxon = '' if obj.taxon is None else obj.taxon.name
        return taxon

    def get_taxon_ncbi_id(self, obj):
        ncbi_id = '' if obj.taxon is None else obj.taxon.ncbi_id
        return ncbi_id


class InstrumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Instrument
        fields = "__all__"


class InstrumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstrumentType
        fields = "__all__"


class SampleKindSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleKind
        fields = "__all__"


class ProtocolSerializer(serializers.ModelSerializer):
    property_types = serializers.SerializerMethodField()

    class Meta:
        model = Protocol
        fields = "__all__"
        extra_fields = ('property_types')
    
    def get_property_types(self, obj):
        protocol_content_type = ContentType.objects.get_for_model(Protocol)
        return PropertyTypeSerializer(
            PropertyType.objects.filter(object_id=obj.id, content_type=protocol_content_type), many=True
        ).data


class ProcessSerializer(serializers.ModelSerializer):
    children_properties = serializers.SerializerMethodField()
    children_processes = serializers.SerializerMethodField()
    imported_template_filename = serializers.CharField(read_only=True, source="imported_template.filename")

    class Meta:
        model = Process
        fields = "__all__"
        extra_fields = ('children_processes', 'imported_template_filename')

    def get_children_properties(self, obj):
        process_content_type = ContentType.objects.get_for_model(Process)
        return PropertyValue.objects.filter(object_id=obj.id, content_type=process_content_type).values_list('id', flat=True)

    def get_children_processes(self, obj):
        return Process.objects.filter(parent_process=obj.id).values_list('id', flat=True)


class ProcessMeasurementSerializer(serializers.ModelSerializer):
    protocol = serializers.IntegerField(read_only=True, source="process.protocol.id")
    child_sample = serializers.IntegerField(read_only=True)
    properties = serializers.SerializerMethodField()

    class Meta:
        model = ProcessMeasurement
        fields = "__all__"
        extra_fields = ('protocol', 'child_sample')

    def get_properties(self, obj):
        pm_content_type = ContentType.objects.get_for_model(ProcessMeasurement)
        return PropertyValue.objects.filter(object_id=obj.id, content_type=pm_content_type).values_list('id', flat=True)


class ProcessMeasurementExportSerializer(serializers.ModelSerializer):
    process_measurement_id = serializers.IntegerField(read_only=True, source="id")
    protocol_name = serializers.CharField(read_only=True, source="process.protocol.name")
    child_sample_name = serializers.CharField(read_only=True)
    source_sample_name = serializers.CharField(read_only=True)

    class Meta:
        model = ProcessMeasurement
        fields = ('process_measurement_id', 'process_id', 'protocol_name', 'source_sample_name', 'child_sample_name', 'volume_used', 'execution_date', 'comment')


class ProcessMeasurementWithPropertiesExportSerializer(serializers.ModelSerializer):
    DEFAULT_META_FIELDS = ( 'process_measurement_id',
                            'process_id',
                            'protocol_name',
                            'source_sample_name',
                            'child_sample_name',
                            'volume_used',
                            'execution_date',
                            'comment' )

    def __init__(self, *args, **kwargs):
        # Reset Meta fields
        self.Meta.fields = self.DEFAULT_META_FIELDS
        # Instantiate the superclass normally
        super(ProcessMeasurementWithPropertiesExportSerializer, self).__init__(*args, **kwargs)
        # List all property fields that are tied to the protocol
        self.property_types = self.list_property_types(self.instance)
        for property_type in self.property_types:
            self.fields[property_type.name] = serializers.CharField(read_only=True)
            self.Meta.fields = self.Meta.fields + (property_type.name,)

    process_measurement_id = serializers.IntegerField(read_only=True, source="id")
    protocol_name = serializers.CharField(read_only=True, source="process.protocol.name")
    child_sample_name = serializers.CharField(read_only=True)
    source_sample_name = serializers.CharField(read_only=True)

    class Meta:
        model = ProcessMeasurement
        fields = ('process_measurement_id', 'process_id', 'protocol_name', 'source_sample_name', 'child_sample_name', 'volume_used', 'execution_date', 'comment')

    def list_property_types(self, obj):
        protocol_content_type = ContentType.objects.get_for_model(Protocol)
        return PropertyType.objects.filter(object_id=obj[0].process.protocol.id, content_type=protocol_content_type)
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        for property_type in self.property_types:
            pm_property_value = PropertyValue.objects.filter(object_id=instance.id, property_type=property_type)
            p_property_value = PropertyValue.objects.filter(object_id=instance.process.id, property_type=property_type)
            property_value = pm_property_value.union(p_property_value).first() # union between cases : process or process measurement property value
            data[property_type.name] = property_value.value if property_value else None # manually insert the property values in the column
        return data


class PropertyTypeSerializer(serializers.ModelSerializer):
    model = serializers.SerializerMethodField()

    class Meta:
        model = PropertyType
        fields = ('id', 'name', 'model')
    
    def get_model(self, obj):
        return PropertyValue.objects.filter(property_type=obj).values_list('content_type__model', flat=True).first()

class PropertyValueSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(read_only=True, source="property_type.name")

    class Meta:
        model = PropertyValue
        fields = "__all__"
        extra_fields = ('property_name')

class SampleMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleMetadata
        fields = "__all__"


class SampleSerializer(serializers.ModelSerializer):
    extracted_from = serializers.SerializerMethodField()
    sample_kind = serializers.PrimaryKeyRelatedField(read_only=True, source="derived_sample_not_pool.sample_kind")
    process_measurements = serializers.PrimaryKeyRelatedField(source='process_measurement', many=True, read_only=True)
    derived_samples__projects = serializers.PrimaryKeyRelatedField(read_only=True, many=True)
    biosample_id = serializers.IntegerField(read_only=True, source="biosample_not_pool.id")
    individual = serializers.PrimaryKeyRelatedField(read_only=True, source="biosample_not_pool.individual")
    alias = serializers.CharField(read_only=True, source="biosample_not_pool.alias")
    collection_site = serializers.CharField(read_only=True, source="biosample_not_pool.collection_site")
    experimental_group = serializers.JSONField(read_only=True, source="derived_sample_not_pool.experimental_group")
    tissue_source = serializers.PrimaryKeyRelatedField(read_only=True, source="derived_sample_not_pool.tissue_source")
    quality_flag = serializers.SerializerMethodField()
    quantity_flag = serializers.SerializerMethodField()
    is_library = serializers.SerializerMethodField()

    class Meta:
        model = Sample
        exclude = ('derived_samples', )

    def get_extracted_from(self, obj):
        return obj.extracted_from and obj.extracted_from.id
    
    def get_is_library(self, obj):
        return obj.is_library

    def get_quality_flag(self, obj):
        return obj.quality_flag

    def get_quantity_flag(self, obj):
        return obj.quantity_flag

class SampleExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sample
        fields = ('sample_id', 'sample_name', 'biosample_id', 'alias', 'individual_alias', 'sample_kind', 'tissue_source',
                  'container', 'container_kind', 'container_name', 'container_barcode', 'coordinates',
                  'location_barcode', 'location_coord', 'container_full_location',
                  'current_volume', 'concentration', 'creation_date', 'collection_site', 'experimental_group',
                  'individual_name', 'sex', 'taxon', 'cohort', 'pedigree', 'father_name', 'mother_name',
                  'quality_flag', 'quantity_flag', 'derived_samples__projects', 'depleted', 'is_library', 'comment')


class NestedSampleSerializer(serializers.ModelSerializer):
    # Serialize foreign keys' objects; don't allow posting new objects (rather accept foreign keys)
    individual = IndividualSerializer(read_only=True, source="biosample_not_pool.individual")
    container = SimpleContainerSerializer(read_only=True)
    # Derived Sample and Biosample attributes
    alias = serializers.CharField(read_only=True, source="biosample_not_pool.alias")
    collection_site = serializers.CharField(read_only=True, source="biosample_not_pool.collection_site")
    experimental_group = serializers.JSONField(read_only=True, source="derived_sample_not_pool.experimental_group")
    tissue_source = serializers.CharField(read_only=True, source="derived_sample_not_pool.tissue_source.name")
    sample_kind = serializers.CharField(read_only=True, source="derived_sample_not_pool.sample_kind.name")
    quantity_flag = serializers.SerializerMethodField()
    quality_flag = serializers.SerializerMethodField()
    derived_samples__projects = serializers.PrimaryKeyRelatedField(read_only=True, many=True)

    class Meta:
        model = Sample
        exclude = ('derived_samples', )

    def get_quality_flag(self, obj):
        return obj.quality_flag

    def get_quantity_flag(self, obj):
        return obj.quantity_flag


class LibrarySerializer(serializers.ModelSerializer):
    biosample_id = serializers.IntegerField(read_only=True, source="biosample_not_pool.id")
    container = serializers.CharField(read_only=True, source="container.id")
    derived_samples__projects = serializers.PrimaryKeyRelatedField(read_only=True, many=True)
    quality_flag = serializers.SerializerMethodField()
    quantity_flag = serializers.SerializerMethodField()
    concentration_ng_ul = serializers.DecimalField(max_digits=20, decimal_places=3, read_only=True, source="concentration")
    concentration_nm = serializers.SerializerMethodField()
    quantity_ng = serializers.SerializerMethodField()
    library_type = serializers.CharField(read_only=True, source="derived_sample_not_pool.library.library_type.name")
    platform = serializers.CharField(read_only=True, source="derived_sample_not_pool.library.platform.name")
    index = serializers.CharField(read_only=True, source="derived_sample_not_pool.library.index.id")
    library_size = serializers.DecimalField(max_digits=20, decimal_places=0, read_only=True, source="derived_sample_not_pool.library.library_size")

    class Meta:
        model = Sample
        fields = ('id', 'name', 'biosample_id', 'container', 'coordinates', 'volume',
                  'concentration_ng_ul', 'concentration_nm', 'quantity_ng', 'creation_date', 'quality_flag',
                  'quantity_flag', 'derived_samples__projects', 'depleted', 'library_type', 'platform', 'index', 'library_size')

    def get_quality_flag(self, obj):
        return obj.quality_flag

    def get_quantity_flag(self, obj):
        return obj.quantity_flag

    def get_concentration_nm(self, obj):
        # If object is not a library or a pool of libraries return none
        if not obj.is_library:
            return None
        else:
            return convert_library_concentration_from_ngbyul_to_nm(obj, obj.concentration)

    def get_quantity_ng(self, obj):
        if not obj.concentration:
            return None
        else:
            return obj.concentration * obj.volume


class LibraryExportSerializer(serializers.ModelSerializer):
    biosample_id = serializers.IntegerField(read_only=True, source="biosample_not_pool.id")
    projects = serializers.PrimaryKeyRelatedField(read_only=True, many=True)
    quality_flag = serializers.SerializerMethodField()
    quantity_flag = serializers.SerializerMethodField()
    concentration_ng_ul = serializers.DecimalField(max_digits=20, decimal_places=3, read_only=True, source="concentration")
    concentration_nm = serializers.SerializerMethodField()
    quantity_ng = serializers.SerializerMethodField()
    library_type = serializers.CharField(read_only=True, source="derived_sample_not_pool.library.library_type.name")
    platform = serializers.CharField(read_only=True, source="derived_sample_not_pool.library.platform.name")
    index = serializers.CharField(read_only=True, source="derived_sample_not_pool.library.index.name")
    library_size = serializers.DecimalField(max_digits=20, decimal_places=0, read_only=True, source="derived_sample_not_pool.library.library_size")

    class Meta:
        model = Sample
        fields = ('id', 'name', 'biosample_id', 'container', 'coordinates', 'volume', 
                  'concentration_ng_ul', 'concentration_nm', 'quantity_ng', 'creation_date', 'quality_flag',
                  'quantity_flag', 'projects', 'depleted', 'library_type', 'platform', 'index', 'library_size')
    
    def get_quality_flag(self, obj):
        if obj.quality_flag is None:
            return None
        else:
            return "Passed" if obj.quality_flag else "Failed"

    def get_quantity_flag(self, obj):
        if obj.quantity_flag is None:
            return None
        else:
            return "Passed" if obj.quantity_flag else "Failed"

    # TODO : update this formula to include RNA and single strand DNA
    def get_concentration_nm(self, obj):
        # If object is not a library or a pool of libraries return none
        if not obj.is_library:
            return None
        else:
            return convert_library_concentration_from_ngbyul_to_nm(obj, obj.concentration)

    def get_quantity_ng(self, obj):
        if not obj.concentration:
            return None
        else:
            return obj.concentration * obj.volume


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
        fields = ("id", "username", "password", "first_name", "last_name", "email", "groups", "is_staff", "is_superuser", "is_active", "date_joined")
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
        exclude = ("derived_samples",)


class ProjectExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ("id", "name", "principal_investigator", "requestor_name", "requestor_email", "status", "targeted_end_date",  "comment")


class IndexSerializer(serializers.ModelSerializer):
    index_set = serializers.CharField(read_only=True, source="index_set.name")
    index_structure = serializers.CharField(read_only=True, source="index_structure.name")
    class Meta:
        model = Index
        fields = "__all__"


class IndexExportSerializer(serializers.ModelSerializer):
    index_set = serializers.CharField(read_only=True, source="index_set.name")
    index_structure = serializers.CharField(read_only=True, source="index_structure.name")

    sequences_3prime = serializers.SerializerMethodField()
    sequences_5prime = serializers.SerializerMethodField()

    class Meta:
        model = Index
        fields = ("id", "name", "index_set", "index_structure", "sequences_3prime", "sequences_5prime")

    def get_sequences_3prime(self, obj):
        sequences = obj.list_3prime_sequences
        return ", ".join(sequences)
    
    def get_sequences_5prime(self, obj):
        sequences = obj.list_5prime_sequences
        return ", ".join(sequences)


class IndexSetSerializer(serializers.ModelSerializer):
    index_count = serializers.SerializerMethodField()

    class Meta:
        model = IndexSet
        fields = "__all__"

    def get_index_count(self, obj):
        return Index.objects.filter(index_set=obj.id).count()


class SequenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sequence
        fields = "__all__"


class PlatformSerializer(serializers.ModelSerializer):
    class Meta:
        model = Platform
        fields = "__all__"


class LibraryTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryType
        fields = "__all__"

class ImportedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportedFile
        fields = "__all__"

class DatasetSerializer(serializers.ModelSerializer):
    files = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    released_status_count = serializers.SerializerMethodField()
    latest_release_update = serializers.SerializerMethodField()

    class Meta:
        model = Dataset
        fields = ("id", "external_project_id", "run_name", "lane", "files", "released_status_count", "latest_release_update")

    def get_released_status_count(self, obj):
        return DatasetFile.objects.filter(dataset=obj.id, release_status=ReleaseStatus.RELEASED).count()
    
    def get_latest_release_update(self, obj):
        return DatasetFile.objects.filter(dataset=obj.id).aggregate(Max("release_status_timestamp"))["release_status_timestamp__max"]

class DatasetFileSerializer(serializers.ModelSerializer):

    class Meta:
        model = DatasetFile
        fields = ("id", "dataset", "file_path", "sample_name", "release_status", "release_status_timestamp")
