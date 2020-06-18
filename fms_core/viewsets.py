from django.contrib.auth.models import User
from django.http.response import HttpResponseNotFound
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from reversion.models import Version

from .fzy import score
from .containers import ContainerSpec, CONTAINER_KIND_SPECS
from .models import Container, Sample, Individual
from .serializers import ContainerSerializer, SampleSerializer, IndividualSerializer, VersionSerializer, UserSerializer

__all__ = [
    "ContainerKindViewSet",
    "ContainerViewSet",
    "IndividualViewSet",
    "QueryViewSet",
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
    pagination_class = None
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
    filterset_fields = ["location"]

    @action(detail=False, methods=["get"])
    def list_root(self, request, *args, **kwargs):
        containers_data = Container.objects.filter(location=None)
        page = self.paginate_queryset(containers_data)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(containers_data, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def list_children(self, request, *args, **kwargs):
        serializer = self.get_serializer(Container.objects.filter(location=kwargs['pk']), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def list_parents(self, request, *args, **kwargs):
        containerid = kwargs['pk']
        containers = []
        current = Container.objects.get(pk=containerid)
        try:
            current = Container.objects.get(pk=current.location)
        except:
            current = None
        while current:
            containers.append(current)
            try:
                current = Container.objects.get(pk=current.location)
            except:
                current = None
        containers.reverse()
        serializer = self.get_serializer(containers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def list_samples(self, request, *args, **kwargs):
        container = Container.objects.get(pk=kwargs['pk'])
        samples_id = self.get_serializer(container).data["samples"]
        samples = Sample.objects.filter(pk__in=samples_id)
        serializer = SampleSerializer(samples, many=True)
        return Response(serializer.data)

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())


class SampleViewSet(viewsets.ModelViewSet):
    queryset = Sample.objects.all()
    serializer_class = SampleSerializer
    filterset_fields = [
        "biospecimen_type",
        "depleted",
        "tissue_source",
    ]

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())


class IndividualViewSet(viewsets.ModelViewSet):
    queryset = Individual.objects.all()
    serializer_class = IndividualSerializer
    filterset_fields = [
        "taxon",
        "sex",
        "pedigree",
        "cohort",
    ]

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())


# noinspection PyMethodMayBeStatic,PyUnusedLocal
class QueryViewSet(viewsets.ViewSet):
    basename = "query"

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.GET["q"]

        if len(query) == 0:
            return Response([])

        def serialize(s):
            item_type = s["type"]
            if item_type == Container:
                s["type"] = "container"
                s["item"] = ContainerSerializer(s["item"]).data
                return s
            if item_type == Sample:
                s["type"] = "sample"
                s["item"] = SampleSerializer(s["item"]).data
                return s
            if item_type == Individual:
                s["type"] = "individual"
                s["item"] = IndividualSerializer(s["item"]).data
                return s
            if item_type == User:
                s["type"] = "user"
                s["item"] = UserSerializer(s["item"]).data
                return s
            raise ValueError('unreachable')

        def query_and_score(model, selector):
            results = [{
                    "score": score(query, selector(s)),
                    "type": model,
                    "item": s
                } for s in model.objects.all()]
            return list(filter(lambda c: c["score"] > 0, results))

        containers = query_and_score(Container, lambda c: c.name)
        individuals = query_and_score(Individual, lambda c: c.id)
        samples = query_and_score(Sample, lambda c: c.name)
        users = query_and_score(User, lambda c: c.username + c.first_name + c.last_name)

        results = containers + individuals + samples + users
        results.sort(key=lambda c: c["score"], reverse=True)
        data = map(serialize, results)

        return Response(data)


class VersionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Version.objects.all().prefetch_related("content_type", "revision")
    serializer_class = VersionSerializer
    filterset_fields = ["content_type__model", "revision__user"]


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
