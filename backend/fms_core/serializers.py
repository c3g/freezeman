from collections import defaultdict
from typing import Any
from django.contrib.auth.models import User, Group
from django.contrib.contenttypes.models import ContentType
from fms_core.services.taxon import can_edit_taxon
from fms_core.services.referenceGenome import can_edit_referenceGenome
from rest_framework import serializers
from reversion.models import Version, Revision
from django.db import models
from django.db.models import Max, Sum, Subquery, Q
from fms_core.services.study import can_remove_study
from fms_core.services.sample_lineage import get_sample_source_from_derived_sample
from fms_core.coordinates import convert_ordinal_to_alpha_digit_coord

from .models import (
    Biosample,
    Container,
    Dataset,
    DatasetFile,
    Readset,
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
    Metric,
    ArchivedComment,
    IndexBySet,
    SampleIdentityMatch,
    SampleIdentity,
    FreezemanUser,
    Profile,
)

from .models._constants import ReleaseStatus
from .containers import CONTAINER_KIND_SPECS


__all__ = [
    "ContainerSerializer",
    "ContainerExportSerializer",
    "DatasetSerializer",
    "DatasetFileSerializer",
    "ReadsetSerializer",
    "ExperimentRunSerializer",
    "ExperimentRunExportSerializer",
    "ExternalExperimentRunSerializer",
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
    "MetricSerializer",
    "ArchivedCommentSerializer",
    "SampleIdentityMatchSerializer",
    "SampleIdentitySerializer",
    "ProfileSerializer",
]

class BiosampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Biosample
        fields = "__all__"

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
    lanes = serializers.SerializerMethodField()

    class Meta:
        model = ExperimentRun
        fields = "__all__"
        extra_fields = ('children_processes', 'instrument_type', 'platform', 'lanes')

    def get_children_processes(self, obj):
        return Process.objects.filter(parent_process=obj.process).values_list('id', flat=True)

    def get_instrument_type(self, obj):
        return obj.instrument.type.type

    def get_platform(self, obj):
        return obj.instrument.type.platform.name

    def get_lanes(self, obj):
        container_spec = CONTAINER_KIND_SPECS.get(obj.container.kind, ())
        nb_lanes = 1
        for dimension in container_spec.coordinate_spec:
            nb_lanes = nb_lanes * len(dimension)
        return list(range(1, nb_lanes + 1))

class ExperimentRunExportSerializer(serializers.ModelSerializer):
    experiment_run_id = serializers.IntegerField(read_only=True, source="id")
    experiment_run_name = serializers.CharField(read_only=True, source="name")
    run_type = serializers.CharField(read_only=True, source="run_type.name")
    instrument = serializers.CharField(read_only=True, source="instrument.name")
    container_kind = serializers.CharField(read_only=True, source="container.kind")
    container_name = serializers.CharField(read_only=True, source="container.name")
    container_barcode = serializers.CharField(read_only=True, source="container.barcode")
    lanes = serializers.SerializerMethodField()

    class Meta:
        model = ExperimentRun
        fields = ('experiment_run_id',
                  'experiment_run_name',
                  'run_type',
                  'instrument',
                  'container_kind',
                  'container_name',
                  'container_barcode',
                  'start_date',
                  'end_time',
                  'run_processing_launch_time',
                  'run_processing_start_time',
                  'run_processing_end_time',
                  'lanes')

    def get_lanes(self, obj):
        container_spec = CONTAINER_KIND_SPECS.get(obj.container.kind, ())
        nb_lanes = 1
        for dimension in container_spec.coordinate_spec:
            nb_lanes = nb_lanes * len(dimension)
        return ", ".join([str(x) for x in range(1, nb_lanes + 1)])


class ExternalExperimentRunSerializer(serializers.ModelSerializer):
    lanes = serializers.SerializerMethodField()
    latest_submission_timestamp = serializers.SerializerMethodField()

    class Meta:
        model = Dataset
        fields = ("run_name", "lanes", "latest_submission_timestamp")

    def get_lanes(self, obj):
        return Dataset.objects.filter(run_name=obj.run_name).values_list("lane", flat=True).distinct()

    def get_latest_submission_timestamp(self, obj):
        return Dataset.objects.filter(run_name=obj.run_name).values_list("updated_at", flat=True).order_by("-updated_at")[:1]


class RunTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RunType
        fields = "__all__"


class TaxonSerializer(serializers.ModelSerializer):
    editable = serializers.SerializerMethodField()
    class Meta:
        model = Taxon
        fields = ("id",
                  "name",
                  "ncbi_id",
                  "editable")
    def get_editable(self, obj):
        return can_edit_taxon(obj.id)


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
                  "reference_genome_assembly_name",
                  "generic")

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

class ProcessMeasurementWithPropertiesExportListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        process_measurements = data.all() if isinstance(data, models.Manager) else data
        process_measurements = process_measurements.select_related("process", "process__protocol")

        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        property_types = PropertyType.objects.filter(
            object_id__in=Subquery(process_measurements.values("process__protocol__id")),
            content_type=protocol_content_type
        ).values("id", "name", "object_id").all()

        property_values = PropertyValue.objects.filter(
            property_type__in=Subquery(property_types.values("id")),
        ).filter(
            Q(object_id__in=Subquery(process_measurements.values("process__id"))) |
            Q(object_id__in=Subquery(process_measurements.values("id")))
        ).values("property_type_id", "value", "object_id").all()

        property_types_by_protocol = defaultdict(list[tuple[int, str]])
        for property_type in property_types:
            protocol_id = property_type['object_id']
            property_types_by_protocol[protocol_id].append((property_type['id'], property_type['name']))

        property_value_by_pm_and_pt = defaultdict[int, dict[int, Any]](dict)
        for property_value in property_values:
            property_type_id = property_value['property_type_id']
            value = property_value['value']
            process_maybe_measurement_id = property_value['object_id']
            property_value_by_pm_and_pt[process_maybe_measurement_id][property_type_id] = value

        data = []
        for process_measurement in process_measurements:
            datum = self.child.to_representation(process_measurement)
            protocol_id = process_measurement.process.protocol.id
            property_types = property_types_by_protocol.get(protocol_id, [])
            for property_type_id, property_type_name in property_types:

                property_value = (
                    property_value_by_pm_and_pt.get(process_measurement.id, {})
                    or
                    property_value_by_pm_and_pt.get(process_measurement.process.id, {})
                ).get(property_type_id, None)
                if property_value is not None:
                    datum[property_type_name] = property_value
            data.append(datum)
        return data

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
        list_serializer_class = ProcessMeasurementWithPropertiesExportListSerializer
        fields = ('process_measurement_id', 'process_id', 'protocol_name', 'source_sample_name', 'child_sample_name', 'volume_used', 'execution_date', 'comment')

    def list_property_types(self, obj):
        protocol_content_type = ContentType.objects.get_for_model(Protocol)
        return PropertyType.objects.filter(object_id=obj[0].process.protocol.id, content_type=protocol_content_type)


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
    derived_samples_counts = serializers.IntegerField(read_only=True, source="count_derived_samples")

    class Meta:
        fields = ('id', 'biosample_id', 'name', 'alias', 'volume', 'depleted', 'concentration', 'child_of',
                  'extracted_from', 'individual', 'container', 'coordinate', 'sample_kind', 'is_library', 'is_pool',
                  'derived_samples_counts', 'project', 'process_measurements', 'tissue_source', 'creation_date',
                  'collection_site', 'experimental_group', 'quality_flag', 'quantity_flag', 'identity_flag', 'created_by', 'created_at',
                  'updated_by', 'updated_at', 'deleted', 'comment')

class SampleExportSerializer(serializers.Serializer):
    coordinates = serializers.CharField(read_only=True, source="coordinate.name")
    derived_samples_counts = serializers.IntegerField(read_only=True, source="count_derived_samples")

    class Meta:
        fields = ('sample_id', 'sample_name', 'biosample_id', 'alias', 'individual_alias', 'sample_kind', 'tissue_source',
                  'container', 'container_kind', 'container_name', 'container_barcode', 'coordinates',
                  'location_barcode', 'location_coord', 'container_full_location', 'site',
                  'current_volume', 'concentration', 'creation_date', 'collection_site', 'experimental_group',
                  'individual_name', 'sex', 'taxon', 'cohort', 'pedigree', 'father_name', 'mother_name',
                  'quality_flag', 'quantity_flag', 'identity_flag', 'project', 'depleted', 'is_library', 'derived_samples_counts', 'comment')


class LibrarySerializer(serializers.Serializer):
    library_size = serializers.DecimalField(max_digits=20, decimal_places=0, read_only=True, source="fragment_size")
    derived_samples_counts = serializers.IntegerField(read_only=True, source="count_derived_samples")

    class Meta:
        fields = ('id', 'name', 'biosample_id', 'container', 'coordinate', 'volume', 'is_pool', 'derived_samples_counts',
                  'concentration', 'concentration_nm', 'quantity_ng', 'creation_date', 'quality_flag',
                  'quantity_flag', 'identity_flag', 'project', 'depleted', 'library_type', 'platform', 'index', 'library_size')


class LibraryExportSerializer(serializers.Serializer):
    coordinates = serializers.CharField(read_only=True, source="coordinate.name")
    library_size = serializers.DecimalField(max_digits=20, decimal_places=0, read_only=True, source="fragment_size")
    derived_samples_counts = serializers.IntegerField(read_only=True, source="count_derived_samples")

    class Meta:
        fields = ('id', 'name', 'biosample_id', 'container', 'coordinates', 'volume', 'is_pool', 'derived_samples_counts',
                  'concentration_ng_ul', 'concentration_nm', 'quantity_ng', 'creation_date', 'quality_flag',
                  'quantity_flag', 'identity_flag', 'project', 'depleted', 'library_type', 'platform', 'index', 'library_size')


class VersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Version
        fields = "__all__"
        depth = 1


class RevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Revision
        fields = "__all__"

class ProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)
    preferences = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Profile
        fields = ("id", "name", "preferences")
    
    def get_preferences(self, instance: Profile):
        return instance.final_preferences()

class UserSerializer(serializers.ModelSerializer):
    profile = serializers.IntegerField(read_only=True, source="freezeman_user.profile.id")

    class Meta:
        model = User
        fields = ("id", "username", "password", "first_name", "last_name", "email", "groups", "is_staff", "is_superuser", "is_active", "date_joined", "profile")
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


class IndexSetSerializer(serializers.ModelSerializer):
    index_count = serializers.SerializerMethodField()

    class Meta:
        model = IndexSet
        fields = "__all__"

    def get_index_count(self, obj):
        return IndexBySet.objects.filter(index_set=obj).count()


class IndexSerializer(serializers.ModelSerializer):
    index_sets = serializers.SlugRelatedField(many=True, read_only=True, slug_field="name")
    index_structure = serializers.CharField(read_only=True, source="index_structure.name")
    class Meta:
        model = Index
        fields = "__all__"


class IndexExportSerializer(serializers.ModelSerializer):
    index_sets = serializers.SerializerMethodField()
    index_structure = serializers.CharField(read_only=True, source="index_structure.name")

    sequences_3prime = serializers.SerializerMethodField()
    sequences_5prime = serializers.SerializerMethodField()

    class Meta:
        model = Index
        fields = ("id", "name", "external_name", "index_sets", "index_structure", "sequences_3prime", "sequences_5prime")

    def get_index_sets(self, obj):
        index_sets = obj.list_index_sets
        return ", ".join(index_sets)

    def get_sequences_3prime(self, obj):
        sequences = obj.list_3prime_sequences
        return ", ".join(sequences)

    def get_sequences_5prime(self, obj):
        sequences = obj.list_5prime_sequences
        return ", ".join(sequences)


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

class ArchivedCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArchivedComment
        fields = "__all__"

class DatasetSerializer(serializers.ModelSerializer):
    files = serializers.SerializerMethodField()
    released_status_count = serializers.SerializerMethodField()
    blocked_status_count = serializers.SerializerMethodField()
    readset_count = serializers.SerializerMethodField()
    archived_comments = ArchivedCommentSerializer("archived_comments", many=True)
    latest_release_update = serializers.SerializerMethodField()
    released_by = serializers.SerializerMethodField()
    validation_status = serializers.SerializerMethodField()
    latest_validation_update = serializers.SerializerMethodField()
    validated_by = serializers.SerializerMethodField()
    external_project_id = serializers.CharField(read_only=True, source="project.external_id")
    project_name = serializers.CharField(read_only=True, source="project.name")
    run_name = serializers.CharField(read_only=True, source="experiment_run.name")

    class Meta:
        model = Dataset
        fields = ("id", "external_project_id", "released_by", "validated_by", "latest_validation_update", "run_name", "experiment_run_id", "lane", "files", "released_status_count", "blocked_status_count", "latest_release_update", "validation_status", "project_id", "project_name", "metric_report_url", "readset_count", "archived_comments")

    def get_files(self, obj):
        return DatasetFile.objects.filter(readset__dataset=obj.id).values_list("id", flat=True)

    def get_released_status_count(self, obj):
        return Readset.objects.filter(dataset=obj.id, release_status=ReleaseStatus.RELEASED).count()

    def get_blocked_status_count(self, obj):
        return Readset.objects.filter(dataset=obj.id, release_status=ReleaseStatus.BLOCKED).count()

    def get_latest_release_update(self, obj):
        return Readset.objects.filter(dataset=obj.id).aggregate(Max("release_status_timestamp"))["release_status_timestamp__max"]

    def get_readset_count(self, obj):
        return Readset.objects.filter(dataset=obj.id).count()

    def get_validation_status(self, obj):
        return obj.validation_status

    def get_latest_validation_update(self, obj):
        return Readset.objects.filter(dataset=obj.id).aggregate(Max("validation_status_timestamp"))["validation_status_timestamp__max"]

    def get_validated_by(self, obj):
        return obj.validated_by

    def get_released_by(self, obj):
        return obj.released_by

class ReadsetSerializer(serializers.ModelSerializer):
    sample_source = serializers.SerializerMethodField()
    total_size = serializers.SerializerMethodField()
    library_type = serializers.CharField(read_only=True, source="derived_sample.library.library_type.name")
    index = serializers.CharField(read_only=True, source="derived_sample.library.index.name")
    class Meta:
        model = Readset
        fields = ("id", "name", "dataset", "sample_name", "sample_source", "derived_sample", "release_status", "release_status_timestamp", "released_by", "total_size", "validation_status", "validation_status_timestamp", "validated_by", "library_type", "index")

    def get_total_size(self, obj: Readset):
        return DatasetFile.objects.filter(readset=obj.pk).aggregate(total_size=Sum("size"))["total_size"]

    def get_sample_source(self, obj: Readset):
        experiment_container = obj.dataset.experiment_run.container if obj.dataset.experiment_run else None
        if experiment_container is None:
            return None
        else:
            container_spec = CONTAINER_KIND_SPECS.get(experiment_container.kind, None)
            coordinates = convert_ordinal_to_alpha_digit_coord(obj.dataset.lane, container_spec.coordinate_spec if container_spec is not None else None)
            experimental_sample = Sample.objects.get(container=experiment_container, coordinate__name=coordinates)
            source_sample, _, _ = get_sample_source_from_derived_sample(experimental_sample.id, obj.derived_sample.id)
            return source_sample

class ReadsetWithMetricsSerializer(serializers.ModelSerializer):
    sample_source = serializers.SerializerMethodField()
    total_size = serializers.SerializerMethodField()
    metrics = serializers.SerializerMethodField(read_only=True)
    library_type = serializers.CharField(read_only=True, source="derived_sample.library.library_type.name")
    index = serializers.CharField(read_only=True, source="derived_sample.library.index.name")
    class Meta:
        model = Readset
        fields = ("id", "name", "dataset", "sample_name", "sample_source", "derived_sample", "release_status", "release_status_timestamp", "released_by", "total_size", "validation_status", "validation_status_timestamp", "validated_by", "metrics", "library_type", "index")
    def get_metrics(self, instance):
        metrics = instance.metrics.all()
        serialized_metrics = MetricSerializer(metrics, many=True)
        return serialized_metrics.data

    def get_total_size(self, obj: Readset):
        return DatasetFile.objects.filter(readset=obj.pk).aggregate(total_size=Sum("size"))["total_size"]

    def get_sample_source(self, obj: Readset):
        experiment_container = obj.dataset.experiment_run.container if obj.dataset.experiment_run else None
        if experiment_container is None:
            return None
        else:
            container_spec = CONTAINER_KIND_SPECS.get(experiment_container.kind, None)
            coordinates = convert_ordinal_to_alpha_digit_coord(obj.dataset.lane, container_spec.coordinate_spec if container_spec is not None else None)
            experimental_sample = Sample.objects.get(container=experiment_container, coordinate__name=coordinates)
            source_sample, _, _ = get_sample_source_from_derived_sample(experimental_sample.id, obj.derived_sample.id)
            return source_sample

class DatasetFileSerializer(serializers.ModelSerializer):
    readset = ReadsetSerializer(read_only=True)

    class Meta:
        model = DatasetFile
        fields = ("id", "readset", "file_path", "size")

class PooledSampleSerializer(serializers.ModelSerializer):
    ''' Serializes a DerivedBySample object, representing a pooled sample.
    '''
    # Return the id of the pool containing this sample. This allows api clients to request
    # a list of samples from multiple pools and then group them by pool on the client side.
    pool_id = serializers.IntegerField(read_only=True, source='sample.id')

    volume_ratio = serializers.DecimalField(max_digits=16, decimal_places=15, read_only=True)

    # Associated project info
    project_id = serializers.IntegerField(read_only=True, source='project.id')
    project_name = serializers.CharField(read_only=True, source='project.name')

    # Sample info
    alias = serializers.CharField(read_only=True, source='derived_sample.biosample.alias')
    collection_site = serializers.CharField(read_only=True, source='derived_sample.biosample.collection_site')
    experimental_groups = serializers.JSONField(read_only=True, source='derived_sample.experimental_group')
    individual_id = serializers.CharField(read_only=True, source='derived_sample.biosample.individual.id')
    individual_name = serializers.CharField(read_only=True, source='derived_sample.biosample.individual_name')
    parent_sample_id = serializers.CharField(read_only=True)
    parent_sample_name = serializers.CharField(read_only=True)
    container_id = serializers.IntegerField(read_only=True, source='sample.container.id')
    container_barcode = serializers.CharField(read_only=True, source='sample.container.barcode')
    coordinates = serializers.CharField(read_only=True, source='sample.coordinate.name')
    sample_kind = serializers.CharField(read_only=True, source='derived_sample.sample_kind.name')

    # Library info
    index = serializers.CharField(read_only=True, source='derived_sample.library.index.name')
    index_id = serializers.CharField(read_only=True, source='derived_sample.library.index.id')
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
            'index',
            'individual_id',
            'individual_name',
            'library_type',
            'library_selection',
            'library_selection_target',
            'parent_sample_id',
            'parent_sample_name',
            'container_id',
            'container_barcode',
            'coordinates',
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
    volume_ratio = serializers.DecimalField(max_digits=16, decimal_places=15, read_only=True)

    # Associated project info
    project_id = serializers.IntegerField(read_only=True, source='project.id')
    project_name = serializers.CharField(read_only=True, source='project.name')

    # Sample info
    alias = serializers.CharField(read_only=True, source='derived_sample.biosample.alias')
    collection_site = serializers.CharField(read_only=True, source='derived_sample.biosample.collection_site')
    experimental_groups = serializers.JSONField(read_only=True, source='derived_sample.experimental_group')
    parent_sample_id = serializers.CharField(read_only=True)
    parent_sample_name = serializers.CharField(read_only=True)
    container_barcode = serializers.CharField(read_only=True, source='sample.container.barcode')
    coordinates = serializers.CharField(read_only=True, source='sample.coordinate.name')
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
    index_sets = serializers.SerializerMethodField()
    index_sequences_3prime = serializers.SerializerMethodField()
    index_sequences_5prime = serializers.SerializerMethodField()
    library_size = serializers.DecimalField(read_only=True, max_digits=20, decimal_places=0, source='sample.fragment_size')
    library_type = serializers.CharField(read_only=True, source='derived_sample.library.library_type.name')
    library_selection = serializers.CharField(read_only=True, source='derived_sample.library.library_selection.name')
    library_selection_target = serializers.CharField(read_only=True, source='derived_sample.library.library_selection.target')
    platform = serializers.CharField(read_only=True, source='derived_sample.library.platform.name')
    strandedness = serializers.CharField(read_only=True, source='derived_sample.library.strandedness')

    def get_index_sets(self, derived_by_sample):
        library = derived_by_sample.derived_sample.library
        if (library):
            index_sets = library.index.list_index_sets
            return ", ".join(index_sets)
        else:
            return ""

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
            'container_barcode',
            'coordinates',
            'volume_ratio',
            'project_id',
            'project_name',
            'library_size',
            'library_type',
            'library_selection',
            'library_selection_target',
            'platform',
            'index_sets',
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
        fields = ("id", "name", "sheet_name", "column_name", "value")

class StepSerializer(serializers.ModelSerializer):
    step_specifications = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Step
        fields = ["id", "name", "type", "protocol_id","needs_placement", "needs_planning", "step_specifications"]

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
    editable = serializers.SerializerMethodField()
    taxon_id = serializers.IntegerField(read_only=True, source='taxon.id')
    class Meta:
        model = ReferenceGenome
        fields = ("id",
                  "assembly_name",
                  "synonym", "genbank_id",
                  "refseq_id",
                  "taxon_id",
                  "size",
                  "editable")
    def get_editable(self, obj):
        return can_edit_referenceGenome(obj.id)

class StudySerializer(serializers.ModelSerializer):
    removable = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Study
        fields = ("id", "letter", "project_id", "workflow_id", "start", "end", "description", "removable")

    def get_removable(self, instance: Study):
        is_removable, *_ = can_remove_study(instance.pk)
        return is_removable

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
    class Meta:
        model = StepHistory
        fields = ("id", "study", "step_order", "process_measurement", "sample", "workflow_action", "created_at", "created_by")

class CoordinateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coordinate
        fields = "__all__"

class MetricSerializer(serializers.ModelSerializer):
    readset_id = serializers.IntegerField(read_only=True)
    sample_name = serializers.CharField(read_only=True, source='readset.sample_name')
    derived_sample_id = serializers.IntegerField(read_only=True, source='readset.derived_sample_id')
    run_name = serializers.CharField(read_only=True, source='readset.dataset.experiment_run.name')
    experiment_run_id = serializers.IntegerField(read_only=True, source='readset.dataset.exeriment_run_id')
    lane = serializers.IntegerField(read_only=True, source='readset.dataset.lane')

    class Meta:
        model = Metric
        fields = ["id",
                  "name",
                  "metric_group",
                  "readset_id",
                  "sample_name",
                  "derived_sample_id",
                  "run_name",
                  "experiment_run_id",
                  "lane",
                  "value_numeric",
                  "value_string"]

class SampleIdentityMatchSerializer(serializers.ModelSerializer):
    tested_biosample_id = serializers.IntegerField(read_only=True, source='tested.biosample_id')
    matched_biosample_id = serializers.IntegerField(read_only=True, source='matched.biosample_id')
    class Meta:
        model = SampleIdentityMatch
        fields = ["id",
                  "tested_biosample_id",
                  "matched_biosample_id",
                  "matching_site_ratio",
                  "compared_sites"]


class SampleIdentitySerializer(serializers.ModelSerializer):
    sex_concordance = serializers.SerializerMethodField(read_only=True)
    identity_matches = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = SampleIdentity
        fields = ["id",
                  "biosample_id",
                  "conclusive",
                  "predicted_sex",
                  "sex_concordance",
                  "identity_matches"]

    def get_sex_concordance(self, instance: SampleIdentity):
        return instance.sex_concordance
    
    def get_identity_matches(self, instance: SampleIdentity):
        matches = SampleIdentityMatch.objects.filter(Q(tested=instance)).all()
        return SampleIdentityMatchSerializer(matches, many=True).data
