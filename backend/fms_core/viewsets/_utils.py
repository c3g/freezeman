from typing import Any, Dict, Tuple, Union
from tablib import Dataset
from django.db.models import Func
from django.http import HttpResponseBadRequest, HttpResponse
from django.conf import settings

from rest_framework.decorators import action
from rest_framework.response import Response
from reversion.models import Version

import json
import os

from fms_core.serializers import VersionSerializer
from fms_core.template_prefiller.prefiller import PrefillTemplate

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

        return False, (action_def, template_file)

    @action(detail=False, methods=["get"])
    def template_actions(self, request):
        """
        Endpoint off of the parent viewset for listing available template
        actions, converting paths to URIs for better RESTyness.
        """
        actions_list = []
        for action in self.template_action_list:  # Make a list out of the actions
            action_dict = {}
            for (key, value) in action.items(): # For each action build an dict with the key values other than importer
                if key != "importer":
                    if key == "template":
                        for template in value:
                            template["file"] = request.build_absolute_uri(template["file"]) # Return the file as an URI
                    action_dict[key] = value
            actions_list.append(action_dict)
        return Response(actions_list)

    @action(detail=False, methods=["post"])
    def template_check(self, request):
        """
        Checks a template submission without saving any of the data to the
        database. Used to check for errors prior to final submission.
        """

        error, action_data = self._get_action(request)
        if error:
            return HttpResponseBadRequest(json.dumps({"detail": action_data}), content_type="application/json")

        action_def, file = action_data
        _, file_format = os.path.splitext(file.name)

        importer_instance = action_def["importer"]()

        try:
            result = importer_instance.import_template(file=file, format=file_format, dry_run=True)
        except Exception as e:
            result = {
                'valid': False,
                'base_errors': [{
                    "error": str(e),
                    }],
            }
        return Response(result)


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

        action_def, file = action_data
        _, file_format = os.path.splitext(file.name)

        importer_instance = action_def["importer"]()

        try:
            importer_instance.import_template(file=file, format=file_format, dry_run=False)
            if not importer_instance.is_valid:
                return HttpResponseBadRequest(json.dumps({"detail": "Template errors encountered in submission"}),
                                              content_type="application/json")
        except Exception as e:
            raise(e)
        return Response(status=204)

class TemplatePrefillsMixin:
    # When this mixin is used, this list will be overridden to provide a list
    # of templates that uses this viewset for prefilling part of the template
    template_prefill_list = []

    @action(detail=False, methods=["get"])
    def list_prefills(self, request):
        """
        Endpoint off of the parent viewset for listing available template prefills.
        """
        templates_list = []
        for template in self.template_prefill_list:  # Make a list out of the prefilable templates
            template_dict = {}
            template_dict["description"] = template["template"]["identity"]["description"]
            templates_list.append(template_dict)
        return Response(templates_list)

    @action(detail=False, methods=["get"])
    def prefill_template(self, request):
        """
        Endpoint off of the parent viewset for filling up the requested template and returning it.
        """
        template_id = request.GET.get("template")

        try:
            template = self.template_prefill_list[int(template_id)]["template"]
        except (KeyError, ValueError):
            # If the template index is out of bounds or not int-castable, return an error.
            return HttpResponseBadRequest(json.dumps({"detail": f"Template {template_id} not found"}), content_type="application/json")

        queryset = self.filter_queryset(self.get_queryset())
        try:
            filename = "/".join(template["identity"]["file"].split("/")[-2:]) # Remove the /static/ from the served path to search for local path 
            template_path = os.path.join(settings.STATIC_ROOT, filename)
        
            prefilled_template = PrefillTemplate(template_path, template, queryset)
        except Exception as err:
            return HttpResponseBadRequest(json.dumps({"detail": str(err)}), content_type="application/json")
        
        try:
            response = HttpResponse(content=prefilled_template)
            response["Content-Type"] = "application/ms-excel"
            response["Content-Disposition"] = "attachment; filename=" + template["identity"]["file"]
        except Exception as err:
            return HttpResponseBadRequest(json.dumps({"detail": f"Failure to attach the prefilled template to the response."}), content_type="application/json")
        
        return response
        