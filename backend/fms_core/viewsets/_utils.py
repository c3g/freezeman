from typing import Any, Dict, List, Tuple, Union
from tablib import Dataset
from django.db.models import Count, Q, Func, F, Prefetch
from django.conf import settings
from django.http import HttpResponseBadRequest

from rest_framework.decorators import action
from rest_framework.response import Response
from reversion.models import Version
from import_export.results import RowResult

import json

from fms_core.serializers import VersionSerializer

from fms_core.import_tool.importers import ExperimentRunImporter


def versions_detail(obj):
    versions = Version.objects.get_for_object(obj)
    serializer = VersionSerializer(versions, many=True)
    return Response(serializer.data)


def _prefix_keys(prefix: str, d: Dict[str, Any]) -> Dict[str, Any]:
    return {prefix + k: v for k, v in d.items()}

def _list_keys(d: Dict[str, Any]) -> Dict[str, Any]:
    return [k  for k, v in d.items()]


class FZY(Func):
    template = "%(function)s('%(search_term)s', %(expressions)s::cstring)"
    function = "fzy"

    def __init__(self, expression, search_term, **extras):
        super(FZY, self).__init__(
            expression,
            search_term=search_term,
            **extras
        )


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

        # from pandas import pandas as pd
        # excel_raw_data = pd.read_excel(request.FILES.get('template'), header=10)
        # import ipdb; ipdb.sset_trace()

        try:
            eri = ExperimentRunImporter(file=request.FILES.get('template'), format='xlsx')
            eri.import_template()
        except Exception as e:
            print(e)


        import ipdb; ipdb.sset_trace();

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
            "diff_headers": result.diff_headers,
            "valid": not (result.has_errors() or result.has_validation_errors()),
            "has_warnings" : any([r.warnings for r in result.rows]),
            "base_errors": [{
                "error": str(e.error),
                "traceback": e.traceback if settings.DEBUG else "",
            } for e in result.base_errors],
            "rows": [{
                "errors": [{
                    "error": str(e.error),
                    "traceback": e.traceback if settings.DEBUG else "",
                } for e in r.errors],
                "validation_error": r.validation_error,
                "warnings": r.warnings,
                "diff": r.diff,
                "import_type": r.import_type,
            } for r in result.rows if r.import_type != RowResult.IMPORT_TYPE_SKIP],
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
