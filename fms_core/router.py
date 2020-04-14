from rest_framework import routers

from .viewsets import ContainerKindViewSet, ContainerViewSet, SampleViewSet, IndividualViewSet, VersionViewSet

__all__ = ["router"]

router = routers.DefaultRouter()
router.register(r"container-kinds", ContainerKindViewSet, basename="container-kind")
router.register(r"containers", ContainerViewSet)
router.register(r"samples", SampleViewSet)
router.register(r"individuals", IndividualViewSet)
router.register(r"versions", VersionViewSet)
