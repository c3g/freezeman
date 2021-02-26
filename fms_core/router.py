from rest_framework import routers

from .viewsets import (
    ContainerKindViewSet,
    ContainerViewSet,
    IndividualViewSet,
    QueryViewSet,
    SampleViewSet,
    SampleKindViewSet,
    UserViewSet,
    GroupViewSet,
    VersionViewSet,
)

__all__ = ["router"]

router = routers.DefaultRouter()
router.register(r"container-kinds", ContainerKindViewSet, basename="container-kind")
router.register(r"containers", ContainerViewSet)
router.register(r"sample-kinds", SampleKindViewSet, basename="sample-kind")
router.register(r"samples", SampleViewSet)
router.register(r"individuals", IndividualViewSet)
router.register(r"query", QueryViewSet, basename="query")
router.register(r"versions", VersionViewSet)
router.register(r"users", UserViewSet)
router.register(r"groups", GroupViewSet)
