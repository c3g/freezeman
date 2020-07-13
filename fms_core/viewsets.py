from django.contrib.auth.models import User
from django.http.response import HttpResponseNotFound, HttpResponseBadRequest
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from reversion.models import Version
from tablib import Dataset

from .fzy import score
from .containers import ContainerSpec, CONTAINER_KIND_SPECS
from .models import Container, Sample, Individual
from .resources import (
    ContainerResource,
    ContainerMoveResource,
    ContainerRenameResource,
    ExtractionResource,
    SampleResource,
    SampleUpdateResource,
)
from .serializers import ContainerSerializer, SampleSerializer, IndividualSerializer, VersionSerializer, UserSerializer
from .template_paths import (
    CONTAINER_CREATION_TEMPLATE,
    CONTAINER_MOVE_TEMPLATE,
    CONTAINER_RENAME_TEMPLATE,
    SAMPLE_EXTRACTION_TEMPLATE,
    SAMPLE_SUBMISSION_TEMPLATE,
    SAMPLE_UPDATE_TEMPLATE,
)

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


class TemplateActionsMixin:
    template_action_list = []

    @classmethod
    def _get_action(cls, request):
        """
        Gets template action from request data, or returns an error.
        """

        action_id = request.POST.get("action")
        template_file = request.FILES.get("template")

        if action_id is None or template_file is None:
            return True, "Action or template file not found"

        try:
            action_def = cls.template_action_list[int(action_id)]
        except (KeyError, ValueError):
            return True, f"Action {action_id} not found"

        xlsx = template_file.name.endswith("xlsx")
        file_bytes = template_file.read()

        dataset = Dataset().load(file_bytes if xlsx else file_bytes.decode("utf-8"), format="xlsx" if xlsx else "csv")

        return False, (action_def, dataset)

    @action(detail=False, methods=["get"])
    def template_actions(self, request):
        return Response([
            dict((k, request.build_absolute_uri(v) if k == "template" else v) for k, v in a.items() if k != "resource")
            for a in self.template_action_list
        ])

    @action(detail=False, methods=["post"])
    def template_check(self, request):
        error, action_data = self._get_action(request)
        if error:
            return HttpResponseBadRequest({"message": action_data})

        action_def, dataset = action_data

        resource_instance = action_def["resource"]()
        result = resource_instance.import_data(dataset, collect_failed_rows=True, dry_run=True)

        return Response({
            "valid": not (result.has_errors() or result.has_validation_errors()),
            "base_errors": [{
                "error": str(e.error),
                "traceback": e.traceback,
            } for e in result.base_errors],
            "rows": [{
                "errors": [{
                    "error": str(e.error),
                    "traceback": e.traceback,
                } for e in r.errors],
                "validation_error": r.validation_error,
                "diff": r.diff,
                "import_type": r.import_type,
            } for r in result.rows],  # TODO
        })

    @action(detail=False, methods=["post"])
    def template_submit(self, request):
        error, action_data = self._get_action(request)
        if error:
            return HttpResponseBadRequest({"message": action_data})

        action_def, dataset = action_data

        resource_instance = action_def["resource"]()
        result = resource_instance.import_data(dataset)

        if result.has_errors() or result.has_validation_errors():
            return HttpResponseBadRequest()

        return Response(status=204)


class ContainerViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Container.objects.all()
    serializer_class = ContainerSerializer
    filterset_fields = ["location"]

    template_action_list = [
        {
            "name": "Add Containers",
            "description": "Upload the provided template with up to 100 new containers.",
            "template": CONTAINER_CREATION_TEMPLATE,
            "resource": ContainerResource,
        },
        {
            "name": "Move Containers",
            "description": "Upload the provided template with up to 100 containers to move.",
            "template": CONTAINER_MOVE_TEMPLATE,
            "resource": ContainerMoveResource,
        },
        {
            "name": "Rename Containers",
            "description": "Upload the provided template with up to 384 containers to rename.",
            "template": CONTAINER_RENAME_TEMPLATE,
            "resource": ContainerRenameResource,
        }
    ]

    @action(detail=False, methods=["get"])
    def list_root(self, request):
        containers_data = Container.objects.filter(location=None)
        page = self.paginate_queryset(containers_data)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(containers_data, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def list_children(self, request, pk=None):
        serializer = self.get_serializer(Container.objects.filter(location=pk), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def list_parents(self, request, pk=None):
        containers = []
        current = Container.objects.get(pk=pk)
        try:
            current = Container.objects.get(pk=current.location)
        except Container.DoesNotExist:
            current = None
        while current:
            containers.append(current)
            try:
                current = Container.objects.get(pk=current.location)
            except Container.DoesNotExist:
                current = None
        containers.reverse()
        serializer = self.get_serializer(containers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def list_samples(self, request, pk=None):
        container = Container.objects.get(pk=pk)
        samples_id = self.get_serializer(container).data["samples"]
        samples = Sample.objects.filter(pk__in=samples_id)
        serializer = SampleSerializer(samples, many=True)
        return Response(serializer.data)

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())


class SampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Sample.objects.all()
    serializer_class = SampleSerializer
    filterset_fields = [
        "biospecimen_type",
        "depleted",
        "tissue_source",
    ]

    template_action_list = [
        {
            "name": "Add Samples",
            "description": "Upload the provided template with up to 384 new samples.",
            "template": SAMPLE_SUBMISSION_TEMPLATE,
            "resource": SampleResource,
        },
        {
            "name": "Process Extractions",
            "description": "Upload the provided template with up to 96 extractions.",
            "template": SAMPLE_EXTRACTION_TEMPLATE,
            "resource": ExtractionResource,
        },
        {
            "name": "Update Samples",
            "description": "Upload the provided template with up to 384 samples to update.",
            "template": SAMPLE_UPDATE_TEMPLATE,
            "resource": SampleUpdateResource,
        }
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
            return [c for c in ({
                "score": score(query, selector(s)),
                "type": model,
                "item": s
            } for s in model.objects.all()) if c["score"] > 0]

        containers = query_and_score(Container, lambda c: c.name)
        individuals = query_and_score(Individual, lambda c: c.id)
        samples = query_and_score(Sample, lambda c: c.name)
        users = query_and_score(User, lambda c: c.username + c.first_name + c.last_name)

        results = containers + individuals + samples + users
        results.sort(key=lambda c: c["score"], reverse=True)
        data = map(serialize, results[:100])

        return Response(data)


class VersionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Version.objects.all().prefetch_related("content_type", "revision")
    serializer_class = VersionSerializer
    filterset_fields = ["content_type__model", "revision__user"]


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
