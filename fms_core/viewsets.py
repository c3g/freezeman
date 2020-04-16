from django.contrib.auth.models import User
from django.http.response import HttpResponseNotFound
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from reversion.models import Version

from .containers import ContainerSpec, CONTAINER_KIND_SPECS
from .models import Container, Sample, Individual
from .serializers import ContainerSerializer, SampleSerializer, IndividualSerializer, VersionSerializer, UserSerializer


__all__ = [
    "ContainerKindViewSet",
    "ContainerViewSet",
    "IndividualViewSet",
    "SampleViewSet",
    "UserViewSet",
    "VersionViewSet",
]


def versions_detail(obj):
    versions = Version.objects.get_for_object(obj)
    serializer = VersionSerializer(versions, many=True)
    return Response(serializer.data)


# noinspection PyMethodMayBeStatic,PyUnusedLocal
class ContainerKindViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def list(self, request):
        return Response(data=[s.serialize() for s in ContainerSpec.container_specs])

    def retrieve(self, request, pk=None):
        if pk in CONTAINER_KIND_SPECS:
            return Response(data=CONTAINER_KIND_SPECS[pk].serialize())
        return HttpResponseNotFound()


class ContainerViewSet(viewsets.ModelViewSet):
    queryset = Container.objects.all()
    serializer_class = ContainerSerializer

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())


class SampleViewSet(viewsets.ModelViewSet):
    queryset = Sample.objects.all()
    serializer_class = SampleSerializer

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())


class IndividualViewSet(viewsets.ModelViewSet):
    queryset = Individual.objects.all()
    serializer_class = IndividualSerializer

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())


class VersionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Version.objects.all()
    serializer_class = VersionSerializer


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
