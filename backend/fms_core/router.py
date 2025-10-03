from rest_framework import routers

from .viewsets import (
    BiosampleViewSet,
    ContainerKindViewSet,
    ContainerViewSet,
    ExperimentRunViewSet,
    RunTypeViewSet,
    IndexViewSet,
    IndividualViewSet,
    InstrumentViewSet,
    InstrumentTypeViewSet,
    LibraryViewSet,
    LibraryTypeViewSet,
    PlatformViewSet,
    QueryViewSet,
    SampleViewSet,
    SampleKindViewSet,
    SampleMetadataViewSet,
    ProtocolViewSet,
    ProcessViewSet,
    ProcessMeasurementViewSet,
    PropertyValueViewSet,
    UserViewSet,
    GroupViewSet,
    VersionViewSet,
    RevisionViewSet,
    ProjectViewSet,
    SequenceViewSet,
    TaxonViewSet,
    SampleLineageViewSet,
    ImportedFileViewSet,
    DatasetViewSet,
    DatasetFileViewSet,
    ReadsetViewSet,
    PooledSamplesViewSet,
    WorkflowViewSet,
    ReferenceGenomeViewSet,
    StudyViewSet,
    SampleNextStepViewSet,
    StepViewSet,
    SampleNextStepByStudyViewSet,
    StepHistoryViewSet,
    CoordinateViewSet,
    MetricViewSet,
    SamplesheetViewSet,
    ReportViewSet,
    SampleIdentityViewSet,
    ProfileViewSet,
)

__all__ = ["router"]

router = routers.DefaultRouter()
router.register(r"biosamples", BiosampleViewSet)
router.register(r"container-kinds", ContainerKindViewSet, basename="container-kind")
router.register(r"containers", ContainerViewSet)
router.register(r"experiment-runs", ExperimentRunViewSet)
router.register(r"run-types", RunTypeViewSet)
router.register(r"projects", ProjectViewSet)
router.register(r"sample-kinds", SampleKindViewSet, basename="sample-kind")
router.register(r"sample-metadata", SampleMetadataViewSet, basename="sample-metadata")
router.register(r"protocols", ProtocolViewSet)
router.register(r"processes", ProcessViewSet)
router.register(r"process-measurements", ProcessMeasurementViewSet)
router.register(r"property-values", PropertyValueViewSet)
router.register(r"samples", SampleViewSet)
router.register(r"libraries", LibraryViewSet)
router.register(r"pooled-samples", PooledSamplesViewSet)
router.register(r"library-types", LibraryTypeViewSet)
router.register(r"platforms", PlatformViewSet)
router.register(r"indices", IndexViewSet)
router.register(r"sequences", SequenceViewSet)
router.register(r"taxons", TaxonViewSet)
router.register(r"individuals", IndividualViewSet)
router.register(r"instruments", InstrumentViewSet)
router.register(r"instrument-types", InstrumentTypeViewSet)
router.register(r"query", QueryViewSet, basename="query")
router.register(r"versions", VersionViewSet)
router.register(r"revisions", RevisionViewSet)
router.register(r"users", UserViewSet)
router.register(r"groups", GroupViewSet)
router.register(r"sample-lineage", SampleLineageViewSet, basename="sample-lineage")
router.register(r"imported-files", ImportedFileViewSet, basename="imported-files")
router.register(r"datasets", DatasetViewSet, basename="datasets")
router.register(r"readsets", ReadsetViewSet, basename="readsets")
router.register(r"dataset-files", DatasetFileViewSet, basename="dataset-files")
router.register(r"workflows", WorkflowViewSet)
router.register(r"reference-genomes", ReferenceGenomeViewSet)
router.register(r"studies", StudyViewSet)
router.register(r"sample-next-step", SampleNextStepViewSet)
router.register(r"steps", StepViewSet)
router.register(r"sample-next-step-by-study", SampleNextStepByStudyViewSet)
router.register(r"step-histories", StepHistoryViewSet, basename="step-history")
router.register(r"coordinates", CoordinateViewSet)
router.register(r"metrics", MetricViewSet)
router.register(r"samplesheets", SamplesheetViewSet, basename="samplesheets")
router.register(r"reports", ReportViewSet, basename="reports")
router.register(r"sample-identities", SampleIdentityViewSet)
router.register(r"profiles", ProfileViewSet, basename="profiles")