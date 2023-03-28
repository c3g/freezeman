from django.contrib.auth.models import User, Group
from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers
from reversion.models import Version, Revision
from django.db.models import Max, F

from .models import (
    Container,
    Dataset,
    DatasetFile,
    DerivedBySample,
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
    ImportedFile,
    Workflow,
    Step,
    ReferenceGenome,
    Study,
    SampleNextStep,
    StepSpecification,
    StepOrder,
    SampleNextStepByStudy,
    StepHistory,
    Coordinate,
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
    "VersionSerializer",
    "RevisionSerializer",
    "UserSerializer",
    "GroupSerializer",
    "ProjectSerializer",
    "ProjectExportSerializer",
    "SequenceSerializer",
    "TaxonSerializer",
    "ImportedFileSerializer",
    "PooledSampleSerializer",
    "PooledSampleExportSerializer",
    "WorkflowSerializer",
    "ReferenceGenomeSerializer",
    "StudySerializer",
    "SampleNextStepSerializer",
    "StepSpecificationSerializer",
    "StepSerializer",
    "SampleNextStepByStudySerializer",
    "StepHistorySerializer",
    "CoordinateSerializer",
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
    coordinate = serializers.CharField(read_only=True, source="coordinate.name")

    class Meta:
        model = Container
        fields = ('name', 'container_kind', 'barcode', 'location', 'coordinate', 'children_containers_count', 'samples_contained_count', 'comment')

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
        fields = ('experiment_run_id', 'experiment_run_name', 'run_type', 'instrument', 'container_kind', 'container_name', 'container_barcode', 'start_date', 'run_processing_launch_date')


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
    reference_genome_assembly_name = serializers.SerializerMethodField()

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
                  "taxon_ncbi_id",
                  "reference_genome_assembly_name",)
    
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

    def get_reference_genome_assembly_name(self, obj):
        reference_genome_assembly_name = '' if obj.reference_genome is None else obj.reference_genome.assembly_name
        return reference_genome_assembly_name

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

class SampleSerializer(serializers.Serializer):
    class Meta:
        fields = ('id', 'biosample_id', 'name', 'alias', 'volume', 'depleted', 'concentration', 'child_of',
                  'extracted_from', 'individual', 'container', 'coordinate', 'sample_kind', 'is_library', 'is_pool', 'project',
                  'process_measurements', 'tissue_source', 'creation_date', 'collection_site', 'experimental_group',
                  'quality_flag', 'quantity_flag', 'created_by', 'created_at', 'updated_by', 'updated_at', 'deleted', 
                  'comment')

class SampleExportSerializer(serializers.Serializer):
    coordinate = serializers.CharField(read_only=True, source="coordinate.name")

    class Meta:
        fields = ('sample_id', 'sample_name', 'biosample_id', 'alias', 'individual_alias', 'sample_kind', 'tissue_source',
                  'container', 'container_kind', 'container_name', 'container_barcode', 'coordinate',
                  'location_barcode', 'location_coord', 'container_full_location',
                  'current_volume', 'concentration', 'creation_date', 'collection_site', 'experimental_group',
                  'individual_name', 'sex', 'taxon', 'cohort', 'pedigree', 'father_name', 'mother_name',
                  'quality_flag', 'quantity_flag', 'projects', 'depleted', 'is_library', 'comment')


class LibrarySerializer(serializers.Serializer):
    library_size = serializers.DecimalField(max_digits=20, decimal_places=0, read_only=True, source="fragment_size")
    class Meta:
        fields = ('id', 'name', 'biosample_id', 'container', 'coordinate', 'volume', 'is_pool',
                  'concentration', 'concentration_nm', 'quantity_ng', 'creation_date', 'quality_flag',
                  'quantity_flag', 'project', 'depleted', 'library_type', 'platform', 'index', 'library_size')


class LibraryExportSerializer(serializers.Serializer):
    coordinate = serializers.CharField(read_only=True, source="coordinate.name")
    library_size = serializers.DecimalField(max_digits=20, decimal_places=0, read_only=True, source="fragment_size")
    class Meta:
        fields = ('id', 'name', 'biosample_id', 'container', 'coordinate', 'volume', 'is_pool',
                  'concentration_ng_ul', 'concentration_nm', 'quantity_ng', 'creation_date', 'quality_flag',
                  'quantity_flag', 'projects', 'depleted', 'library_type', 'platform', 'index', 'library_size')


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
        fields = '__all__'
        
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
        fields = ("id", "external_project_id", "run_name", "lane", "metric_report_url", "files", "released_status_count", "latest_release_update")

    def get_released_status_count(self, obj):
        return DatasetFile.objects.filter(dataset=obj.id, release_status=ReleaseStatus.RELEASED).count()
    
    def get_latest_release_update(self, obj):
        return DatasetFile.objects.filter(dataset=obj.id).aggregate(Max("release_status_timestamp"))["release_status_timestamp__max"]

class DatasetFileSerializer(serializers.ModelSerializer):

    class Meta:
        model = DatasetFile
        fields = ("id", "dataset", "file_path", "sample_name", "release_status", "release_status_timestamp", "validation_status", "validation_status_timestamp")

class PooledSampleSerializer(serializers.Serializer):
    ''' Serializes a DerivedBySample object, representing a pooled sample. 
    '''
    # Since DerivedBySample doesn't have its own id field, we use the derived_sample id
    # as a top level id in the returned data structure. The UX needs this for 'objectsById' stuff.
    id = serializers.IntegerField(read_only = True, source='derived_sample.id')

    # Return the id of the pool containing this sample. This allows api clients to request
    # a list of samples from multiple pools and then group them by pool on the client side.
    pool_id = serializers.IntegerField(read_only=True, source='sample.id')

    volume_ratio = serializers.DecimalField(max_digits=20, decimal_places=3, read_only=True)

    # Associated project info
    project_id = serializers.IntegerField(read_only=True, source='derived_sample.project.id')
    project_name = serializers.CharField(read_only=True, source='derived_sample.project.name')
    
    # Sample info
    alias = serializers.CharField(read_only=True, source='derived_sample.biosample.alias')
    collection_site = serializers.CharField(read_only=True, source='derived_sample.biosample.collection_site')
    experimental_groups = serializers.JSONField(read_only=True, source='derived_sample.experimental_group')
    individual_id = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.id')
    individual_name = serializers.CharField(read_only=True, source='derived_sample.biosample.individual_name')
    parent_sample_id = serializers.CharField(read_only=True)
    parent_sample_name = serializers.CharField(read_only=True)
    sample_kind = serializers.CharField(read_only=True, source='derived_sample.sample_kind.name')

    # Library info
    index = serializers.CharField(read_only=True, source='derived_sample.library.index.name')
    index_id = serializers.CharField(read_only=True, source='derived_sample.library.index.id')
    index_set = serializers.CharField(read_only=True, source='derived_sample.library.index.index_set.name')
    library_type = serializers.CharField(read_only=True, source='derived_sample.library.library_type.name')
    library_selection = serializers.CharField(read_only=True, source='derived_sample.library.library_selection.name')
    library_selection_target = serializers.CharField(read_only=True, source='derived_sample.library.library_selection.target')
    platform = serializers.CharField(read_only=True, source='derived_sample.library.platform.name')
    strandedness = serializers.CharField(read_only=True, source='derived_sample.library.strandedness')

    class Meta:
        model = DerivedBySample
        fields = [
            'alias',
            'collection_site',
            'experimental_groups',
            'id', 
            'index_id',
            'index_set',
            'index',
            'individual_id',
            'individual_name',
            'library_type',
            'library_selection',
            'library_selection_target',
            'parent_sample_id', 
            'parent_sample_name', 
            'platform',
            'pool_id',
            'project_id', 
            'project_name', 
            'sample_kind',
            'strandedness',
            'volume_ratio', 
            ]

class PooledSampleExportSerializer(serializers.Serializer):
    ''' Serializes a DerivedBySample object, representing a pooled sample, for export to CSV.
    '''
    volume_ratio = serializers.DecimalField(max_digits=20, decimal_places=3, read_only=True)

    # Associated project info
    project_id = serializers.IntegerField(read_only=True, source='derived_sample.project.id')
    project_name = serializers.CharField(read_only=True, source='derived_sample.project.name')
    
    # Sample info
    alias = serializers.CharField(read_only=True, source='derived_sample.biosample.alias')
    collection_site = serializers.CharField(read_only=True, source='derived_sample.biosample.collection_site')
    experimental_groups = serializers.JSONField(read_only=True, source='derived_sample.experimental_group')
    parent_sample_id = serializers.CharField(read_only=True)
    parent_sample_name = serializers.CharField(read_only=True)
    sample_kind = serializers.CharField(read_only=True, source='derived_sample.sample_kind.name')

    # Individual info
    individual_name = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.name')
    taxon_ncbi_id = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.taxon.ncbi_id')
    taxon_name = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.taxon.name')
    sex = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.sex')
    mother = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.mother.name')
    father = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.father.name')
    pedigree = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.pedigree')
    cohort = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.cohort')

    # Library info
    index = serializers.CharField(read_only=True, source='derived_sample.library.index.name')
    index_structure = serializers.CharField(read_only=True, source='derived_sample.library.index.index_structure.name')
    index_set = serializers.CharField(read_only=True, source='derived_sample.library.index.index_set.name')
    index_sequences_3prime = serializers.SerializerMethodField()
    index_sequences_5prime = serializers.SerializerMethodField()
    library_size = serializers.DecimalField(read_only=True, max_digits=20, decimal_places=0, source='sample.fragment_size')
    library_type = serializers.CharField(read_only=True, source='derived_sample.library.library_type.name')
    library_selection = serializers.CharField(read_only=True, source='derived_sample.library.library_selection.name')
    library_selection_target = serializers.CharField(read_only=True, source='derived_sample.library.library_selection.target')
    platform = serializers.CharField(read_only=True, source='derived_sample.library.platform.name')
    strandedness = serializers.CharField(read_only=True, source='derived_sample.library.strandedness')

    def get_index_sequences_3prime(self, derived_by_sample):
        library = derived_by_sample.derived_sample.library
        if (library):
            sequences = library.index.list_3prime_sequences
            return ", ".join(sequences) 
        else:
            return ""
        
    
    def get_index_sequences_5prime(self, derived_by_sample):
        library = derived_by_sample.derived_sample.library
        if (library):
            sequences = library.index.list_5prime_sequences
            return ", ".join(sequences)
        else:
            return ""

    class Meta:
        model = DerivedBySample
        fields = [
            'alias',
            'parent_sample_id', 
            'parent_sample_name', 
            'volume_ratio', 
            'project_id', 
            'project_name',
            'library_size',
            'library_type',
            'library_selection',
            'library_selection_target',
            'platform',
            'index_set',
            'index',
            'index_structure',
            'index_sequences_3prime',
            'index_sequences_5prime',
            'strandedness',
            'sample_kind',
            'collection_site',
            'experimental_groups',
            'cohort',
            'individual_name',
            'taxon_name',
            'taxon_ncbi_id',
            'sex',
            'mother',
            'father',
            'pedigree',
            ]

class StepSpecificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepSpecification
        fields = ("id", "display_name", "sheet_name", "column_name", "value")

class StepSerializer(serializers.ModelSerializer):
    step_specifications = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Step
        fields = ["id", "name", "protocol_id", "step_specifications"]

    def get_step_specifications(self, instance):
        step_specifications = instance.step_specifications.all()
        serialized_data = StepSpecificationSerializer(step_specifications, many=True)
        return serialized_data.data

class StepOrderSerializer(serializers.ModelSerializer):
    step_id = serializers.IntegerField(read_only=True, source='step.id')
    protocol_id = serializers.IntegerField(read_only=True, source='step.protocol_id')
    step_name = serializers.CharField(read_only=True, source='step.name')
    class Meta:
        model = StepOrder
        fields = ["id", "step_id", "step_name", "protocol_id", "order"]

class WorkflowSerializer(serializers.ModelSerializer):
    steps_order = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Workflow
        fields = ("id", "name", "structure", "steps_order")
    
    def get_steps_order(self, instance):
        steps_order = instance.steps_order.all().order_by("order")
        serialized_data = StepOrderSerializer(steps_order, many=True)
        return serialized_data.data

class ReferenceGenomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferenceGenome
        fields = ("id", "assembly_name", "synonym", "genbank_id", "refseq_id", "taxon_id", "size")

class StudySerializer(serializers.ModelSerializer):
    class Meta:
        model = Study
        fields = ("id", "letter", "project_id", "workflow_id", "start", "end")
    
class SampleNextStepSerializer(serializers.ModelSerializer):
    step = StepSerializer(read_only=True)
    studies = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    class Meta:
        model = SampleNextStep
        fields = ("id", "sample", "step", "studies")

class SampleNextStepByStudySerializer(serializers.ModelSerializer):
    sample = serializers.IntegerField(read_only=True, source='sample_next_step.sample.id')
    class Meta:
        model = SampleNextStepByStudy
        fields = ("id", "sample", "step_order", "study")

class StepHistorySerializer(serializers.ModelSerializer):
    sample = serializers.IntegerField(read_only=True, source='process_measurement.source_sample_id')
    class Meta:
        model = StepHistory
        fields = ("id", "study", "step_order", "process_measurement", "sample", "workflow_action")

class CoordinateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coordinate
        fields = "__all__"