import json

from collections import Counter
from django.contrib.auth.models import User
from django.db.models import Count
from django.http.response import HttpResponseNotFound, HttpResponseBadRequest
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from reversion.models import Version
from tablib import Dataset
from typing import Any, Dict, List, Tuple, Union

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
from .serializers import (
    ContainerSerializer,
    ContainerExportSerializer,
    SampleSerializer,
    SampleExportSerializer,
    NestedSampleSerializer,
    IndividualSerializer,
    VersionSerializer,
    UserSerializer,
)
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


FREE_TEXT_FILTERS = ["contains", "icontains"]
CATEGORICAL_FILTERS = ["exact", "in"]
CATEGORICAL_FILTERS_LOOSE = [*CATEGORICAL_FILTERS, *FREE_TEXT_FILTERS]
FK_FILTERS = CATEGORICAL_FILTERS
PK_FILTERS = ["in"]
NULLABLE_FK_FILTERS = [*FK_FILTERS, "isnull"]
SCALAR_FILTERS = ["exact", "lt", "lte", "gt", "gte"]
DATE_FILTERS = [*SCALAR_FILTERS, "year", "month", "week", "week_day", "day"]


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
        return HttpResponseNotFound(json.dumps({"detail": f"Could not find container kind '{pk}'"}),
                                    content_type="application/json")


class TemplateActionsMixin:
    # When this mixin is used, this list will be overridden to provide a list
    # of template actions for the viewset implementation.
    template_action_list = []

    @classmethod
    def _get_action(cls, request) -> Tuple[bool, Union[str, Tuple[dict, Dataset]]]:
        """
        Gets template action from request data. Requests should be
        multipart/form-data, with two key-value pairs:
            action: index of the template action (based on the list provided by template_actions/)
            template: completed template file with data
        Returns a tuple of:
            bool
                True if an error occurred, False if the request was processed
                to the point of reading the file into a dataset.
            Union[str, Tuple[dict, Dataset]]
                str if an error occured, where the string is the error message.
                Dataset otherwise, with the contents of the uploaded file.
        """

        action_id = request.POST.get("action")
        template_file = request.FILES.get("template")

        if action_id is None or template_file is None:
            return True, "Action or template file not found"

        try:
            action_def = cls.template_action_list[int(action_id)]
        except (KeyError, ValueError):
            # If the action index is out of bounds or not int-castable, return an error.
            return True, f"Action {action_id} not found"

        # There are only two file types accepted; .xlsx and .csv. XLSX files
        # must be treated differently since it's binary data.

        xlsx = template_file.name.endswith("xlsx")
        file_bytes = template_file.read()

        dataset = Dataset().load(file_bytes if xlsx else file_bytes.decode("utf-8"), format="xlsx" if xlsx else "csv")

        return False, (action_def, dataset)

    @action(detail=False, methods=["get"])
    def template_actions(self, request):
        """
        Endpoint off of the parent viewset for listing available template
        actions, converting paths to URIs for better RESTyness.
        """
        return Response([
            {k: request.build_absolute_uri(v) if k == "template" else v for k, v in a.items() if k != "resource"}
            for a in self.template_action_list
        ])

    @action(detail=False, methods=["post"])
    def template_check(self, request):
        """
        Checks a template submission without saving any of the data to the
        database. Used to check for errors prior to final submission.
        """

        error, action_data = self._get_action(request)
        if error:
            return HttpResponseBadRequest(json.dumps({"detail": action_data}), content_type="application/json")

        action_def, dataset = action_data

        resource_instance = action_def["resource"]()
        result = resource_instance.import_data(dataset, dry_run=True)

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
        """
        Submits a template action. Should be done only after an initial check,
        since this endpoint does not return any helpful error messages. Will
        save any submitted data to the database unless an error occurs.
        """

        error, action_data = self._get_action(request)
        if error:
            return HttpResponseBadRequest(json.dumps({"detail": action_data}), content_type="application/json")

        action_def, dataset = action_data

        resource_instance = action_def["resource"]()
        result = resource_instance.import_data(dataset)

        if result.has_errors() or result.has_validation_errors():
            # TODO: Better message
            return HttpResponseBadRequest(json.dumps({"detail": "Template errors encountered in submission"}),
                                          content_type="application/json")

        return Response(status=204)


def _prefix_keys(prefix: str, d: Dict[str, Any]) -> Dict[str, Any]:
    return {prefix + k: v for k, v in d.items()}


FiltersetFields = Dict[str, List[str]]


_container_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": ["icontains"],
    "barcode": ["icontains"],
    "kind": CATEGORICAL_FILTERS,
    "coordinates": ["exact", "icontains"],
    "comment": FREE_TEXT_FILTERS,
    "update_comment": FREE_TEXT_FILTERS,
    "location": NULLABLE_FK_FILTERS,
}


_sample_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "name": CATEGORICAL_FILTERS_LOOSE,
    "biospecimen_type": CATEGORICAL_FILTERS,
    "concentration": SCALAR_FILTERS,
    "depleted": ["exact"],
    "collection_site": CATEGORICAL_FILTERS_LOOSE,
    "tissue_source": CATEGORICAL_FILTERS,
    "reception_date": DATE_FILTERS,
    "coordinates": ["exact"],
    "comment": FREE_TEXT_FILTERS,
    "update_comment": FREE_TEXT_FILTERS,

    "volume_used": SCALAR_FILTERS,

    "extracted_from": NULLABLE_FK_FILTERS,  # PK
    "individual": FK_FILTERS,  # PK
    "container": FK_FILTERS,  # PK
    **_prefix_keys("container__", _container_filterset_fields),
}

_sample_minimal_filterset_fields: FiltersetFields = {
    "name": CATEGORICAL_FILTERS_LOOSE,
}

_individual_filterset_fields: FiltersetFields = {
    "id": PK_FILTERS,
    "label": ["in", "icontains"],
    "taxon": CATEGORICAL_FILTERS,
    "sex": CATEGORICAL_FILTERS,
    "pedigree": CATEGORICAL_FILTERS_LOOSE,
    "cohort": CATEGORICAL_FILTERS_LOOSE,

    "mother": NULLABLE_FK_FILTERS,
    "father": NULLABLE_FK_FILTERS,
}


class ContainerViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Container.objects.select_related("location").prefetch_related("children", "samples").all()
    serializer_class = ContainerSerializer
    filterset_fields = {
        **_container_filterset_fields,
        **_prefix_keys("location__", _container_filterset_fields),
        **_prefix_keys("samples__", _sample_minimal_filterset_fields),
    }

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
        },
    ]

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of containers in the
        database. Useful for displaying overview information in dashboard
        front-ends and getting quick figures without needing to download actual
        container records.
        """
        return Response({
            "total_count": Container.objects.all().count(),
            "root_count": Container.objects.filter(location_id__isnull=True).count(),
            "kind_counts": {
                c["kind"]: c["kind__count"]
                for c in Container.objects.values("kind").annotate(Count("kind"))
            },
        })

    @action(detail=False, methods=["get"])
    def list_root(self, _request):
        """
        Lists all "root" containers, i.e. containers which are not nested
        within another container and are at the root of the tree.
        """

        # TODO: Can be replaced by ?location__isnull=True query param
        containers_data = Container.objects.filter(location_id__isnull=True).prefetch_related("children", "samples")
        page = self.paginate_queryset(containers_data)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(containers_data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = ContainerExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def list_children(self, _request, pk=None):
        """
        Lists all containers that are direct children of a specified container.
        """
        # TODO: Can be replaced by ?location=pk query param
        serializer = self.get_serializer(Container.objects.filter(location_id=pk), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def list_parents(self, _request, pk=None):
        """
        Traverses a container's parent hierarchy and returns a list, in order
        from closest-to-root to the queried container, of all the containers in
        that tree traversal.
        """
        containers = []
        current = Container.objects.get(pk=pk).location
        while current:
            containers.append(current)
            current = current.location
        containers.reverse()
        serializer = self.get_serializer(containers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def list_samples(self, _request, pk=None):
        """
        Lists all samples stored in a given container.
        """
        samples = Container.objects.get(pk=pk).samples
        serializer = SampleSerializer(samples, many=True)
        return Response(serializer.data)

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        """
        Lists all django_reversion Version objects associated with a container.
        """
        return versions_detail(self.get_object())


class SampleViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = Sample.objects.all().select_related("individual", "container")

    filterset_fields = {
        **_sample_filterset_fields,
        **_prefix_keys("extracted_from__", _sample_filterset_fields),
        **_prefix_keys("individual__", _individual_filterset_fields),
    }

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

    def get_serializer_class(self):
        # If the nested query param is passed in with a non-false-y string
        # value, use the nested sample serializer; this will nest referenced
        # objects 1 layer deep to provide more data in a single request.

        nested = self.request.query_params.get("nested", False)
        if nested:
            return NestedSampleSerializer
        return SampleSerializer

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = SampleExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def summary(self, _request):
        """
        Returns summary statistics about the current set of samples in the
        database.
        """

        experimental_groups = Counter()
        for eg in Sample.objects.values_list("experimental_group", flat=True):
            experimental_groups.update(eg)

        return Response({
            "total_count": Sample.objects.all().count(),
            "extracted_count": Sample.objects.filter(extracted_from_id__isnull=False).count(),
            "biospecimen_type_counts": {
                c["biospecimen_type"]: c["biospecimen_type__count"]
                for c in Sample.objects.values("biospecimen_type").annotate(Count("biospecimen_type"))
            },
            "tissue_source_counts": {
                c["tissue_source"]: c["tissue_source__count"]
                for c in Sample.objects.values("tissue_source").annotate(Count("tissue_source"))
            },
            "collection_site_counts": {
                c["collection_site"]: c["collection_site__count"]
                for c in Sample.objects.values("collection_site").annotate(Count("collection_site"))
            },
            "experimental_group_counts": dict(experimental_groups),
        })

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, _request, pk=None):
        return versions_detail(self.get_object())


class IndividualViewSet(viewsets.ModelViewSet):
    queryset = Individual.objects.all()
    serializer_class = IndividualSerializer
    filterset_fields = _individual_filterset_fields

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = IndividualSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)


# noinspection PyMethodMayBeStatic,PyUnusedLocal
class QueryViewSet(viewsets.ViewSet):
    basename = "query"

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.GET.get("q")

        if not query:
            return Response([])

        def serialize(s) -> dict:
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
            raise ValueError("unreachable")

        def query_and_score(model, selector):
            return [c for c in ({
                "score": score(query, selector(s)),
                "type": model,
                "item": s
            } for s in model.objects.all()) if c["score"] > 0]

        containers = query_and_score(Container, lambda c: c.name)
        individuals = query_and_score(Individual, lambda c: c.label)
        samples = query_and_score(Sample, lambda c: c.name)
        users = query_and_score(User, lambda c: c.username + c.first_name + c.last_name)

        results = containers + individuals + samples + users
        results.sort(key=lambda c: c["score"], reverse=True)
        data = map(serialize, results[:100])

        return Response(data)


class VersionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Version.objects.all().prefetch_related("content_type", "revision")
    serializer_class = VersionSerializer
    filterset_fields = {
        "object_id": FK_FILTERS,

        # Content type filters
        "content_type__id": FK_FILTERS,
        "content_type__app_label": CATEGORICAL_FILTERS,
        "content_type__model": CATEGORICAL_FILTERS,

        # Revision filters
        "revision__id": FK_FILTERS,
        "revision__date_created": DATE_FILTERS,
        "revision__user": ["exact"],
    }


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
