from rest_framework import routers

from .viewsets import (
    ContainerKindViewSet,
    ContainerViewSet,
    ExperimentRunViewSet,
    RunTypeViewSet,
    IndividualViewSet,
    InstrumentViewSet,
    QueryViewSet,
    SampleViewSet,
    SampleKindViewSet,
    SampleViewViewSet,
    ProtocolViewSet,
    ProcessViewSet,
    ProcessMeasurementViewSet,
    PropertyValueViewSet,
    UserViewSet,
    GroupViewSet,
    VersionViewSet,
    RevisionViewSet,
    ProjectViewSet,
)

__all__ = ["router"]

router = routers.DefaultRouter()
router.register(r"container-kinds", ContainerKindViewSet, basename="container-kind")
router.register(r"containers", ContainerViewSet)
router.register(r"experiment-runs", ExperimentRunViewSet)
router.register(r"run-types", RunTypeViewSet)
router.register(r"projects", ProjectViewSet)
router.register(r"sample-kinds", SampleKindViewSet, basename="sample-kind")
router.register(r"protocols", ProtocolViewSet)
router.register(r"processes", ProcessViewSet)
router.register(r"process-measurements", ProcessMeasurementViewSet)
router.register(r"property-values", PropertyValueViewSet)
router.register(r"samples", SampleViewSet)
router.register(r"samples-view", SampleViewViewSet)
router.register(r"individuals", IndividualViewSet)
router.register(r"instruments", InstrumentViewSet)
router.register(r"query", QueryViewSet, basename="query")
router.register(r"versions", VersionViewSet)
router.register(r"revisions", RevisionViewSet)
router.register(r"users", UserViewSet)
router.register(r"groups", GroupViewSet)
