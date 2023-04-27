from datetime import datetime
from typing import Any, Dict, Tuple, Union, List
from tablib import Dataset
from django.db.models import Func
from wsgiref.util import FileWrapper
from django.http import HttpResponseBadRequest, HttpResponse, StreamingHttpResponse
from django.conf import settings

from rest_framework.decorators import action
from rest_framework.response import Response
from reversion.models import Version

import json
import os

from fms_core.serializers import VersionSerializer
from fms_core.template_prefiller.prefiller import PrefillTemplate, PrefillTemplateFromDict
from fms_core.models import Sample, Protocol, Step

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
        protocol = None
        protocol_id = request.GET.get("protocol")
        if protocol_id:
            protocol = Protocol.objects.filter(id=protocol_id).first()
        for i, action in enumerate(self.template_action_list):  # Make a list out of the actions
            list_templates = []
            for template in action["template"]:
                current_template_protocol_name = template.get("protocol", None)
                if protocol and current_template_protocol_name and protocol.name != current_template_protocol_name:
                    pass
                else:
                    template["file"] = request.build_absolute_uri(template["file"]) # Return the file as an URI
                    list_templates.append(template)
            if len(list_templates) > 0:
                action_dict = {}
                action_dict["id"] = i
                for (key, value) in action.items(): # For each action build an dict with the key values other than importer
                    if key != "importer":
                        if key == "template":
                            action_dict[key] = list_templates
                        else:
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

        importer_instance = action_def["importer"]()

        try:
            result = importer_instance.import_template(file=file, dry_run=True, user=request.user)
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

        importer_instance = action_def["importer"]()

        try:
            result = importer_instance.import_template(file=file, dry_run=False, user=request.user)
            if not importer_instance.is_valid:
                return HttpResponseBadRequest(json.dumps({"detail": "Template errors encountered in submission",
                                                          "base_errors": ", ".join(importer_instance.base_errors)}),
                                              content_type="application/json")
        except Exception as e:
            raise(e)

        if result['output_file']:
            try:
                response = HttpResponse(result['output_file']['content'], content_type="application/zip")
                response["Content-Disposition"] = f"attachment; filename={result['output_file']['name']}"
            except Exception as err:
                return HttpResponseBadRequest(
                    json.dumps({"detail": f"Failure to attach the output file to the response."}),
                    content_type="application/json")
        else:
            response = Response(status=204)
        return response

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
        protocol = None
        protocol_id = request.GET.get("protocol")
        if protocol_id:
            protocol = Protocol.objects.filter(id=protocol_id).first()
        for i, template in enumerate(self.template_prefill_list):  # Make a list out of the prefilable templates
            current_template_protocol_name = template["template"]["identity"].get("protocol", None)
            if protocol and current_template_protocol_name and protocol.name != current_template_protocol_name:
                pass
            else:
                template_dict = {}
                template_dict["id"] = i
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


class TemplatePrefillsWithDictMixin(TemplatePrefillsMixin):
    @classmethod
    def _prepare_prefill_dicts(cls, template, queryset) -> List:
        # Virtual method for dicts building. Surdefine in child class to specify.
        return []

    @action(detail=False, methods=["get"])
    def prefill_template(self, request):
        """
        Endpoint off of the parent viewset for filling up the requested template using a field dict and returning it.
        """
        template_id = request.GET.get("template")

        try:
            template = self.template_prefill_list[int(template_id)]["template"]
        except (KeyError, ValueError):
            # If the template index is out of bounds or not int-castable, return an error.
            return HttpResponseBadRequest(json.dumps({"detail": f"Template {template_id} not found"}), content_type="application/json")

        queryset = self.filter_queryset(self.get_queryset())
        try:
            rows_dicts = self._prepare_prefill_dicts(template, queryset)
            prefilled_template = PrefillTemplateFromDict(template, rows_dicts)
        except Exception as err:
            return HttpResponseBadRequest(json.dumps({"detail": str(err)}), content_type="application/json")
        
        try:
            response = HttpResponse(content=prefilled_template)
            response["Content-Type"] = "application/ms-excel"
            response["Content-Disposition"] = "attachment; filename=" + template["identity"]["file"]
        except Exception as err:
            return HttpResponseBadRequest(json.dumps({"detail": f"Failure to attach the prefilled template to the response."}), content_type="application/json")
        
        return response

class TemplatePrefillsLabWorkMixin(TemplatePrefillsWithDictMixin):
    @classmethod
    def _prepare_prefill_dicts(cls, template, queryset) -> List:
        # Create the dictionnary used for prefilling using template definition and step specs. Tolerate templates with 2 sheets max.
        dict_sheets_rows_dicts = {sheet["name"]: [] for sheet in template["sheets info"]} # Initialize each sheet list

        # Dictionary to identify the sample sheet and the batch sheet
        dict_batch_sheet = {sheet.get("batch"): sheet["name"] for sheet in template["sheets info"] if sheet.get("batch", None) is not None}
        extra_sheet_list = [sheet["name"] for sheet in template["sheets info"] if sheet.get("batch", None) is None]
        # Dictionary to map a sheet to its stitch column
        dict_stitch = {sheet["name"]: sheet.get("stitch_column", None) for sheet in template["sheets info"]}

        step_dict = {}
        for sample_id, step_id in queryset.values_list("sample", "step").distinct():
            new_step = False
            sample_row_dict = {}
            batch_row_dict = {}
            # Use sample to extract the sample information guided by the template definition prefill info.
            sample = Sample.objects.get(id=sample_id)
            for sheet_name, column_name, _, attribute in template["prefill info"]:
                value = getattr(sample, attribute)
                sample_row_dict[column_name] = value
            # Use step to extract specifications and attach it to the correct sheet and column
            step = Step.objects.get(id=step_id)
            for spec in step.step_specifications.all():
                if spec.sheet_name == dict_batch_sheet.get(False, spec.sheet_name): # Sheet defaults to sample sheet
                    sample_row_dict[spec.column_name] = spec.value
                else:
                    if dict_stitch.get(spec.sheet_name, None):
                        sample_row_dict[dict_stitch[spec.sheet_name]] = step.name # User will need to split batches further if needed
                    if not step_dict.get(step.id, None):
                        if dict_stitch.get(spec.sheet_name, None):
                            batch_row_dict[dict_stitch[spec.sheet_name]] = step.name # User will need to split batches further if needed
                        batch_row_dict[spec.column_name] = spec.value
                        new_step = True
            if new_step:
                step_dict[step.id] = step
            # Append current rows to the dict for the sample sheet
            dict_sheets_rows_dicts[dict_batch_sheet[False]].append(sample_row_dict)
            # Append current rows to the dict for the extra sheets
            for sheet_name in extra_sheet_list:
                dict_sheets_rows_dicts[sheet_name].append(sample_row_dict) # make sure there is no duplicate in column name or this would cause issues
            if batch_row_dict:
                dict_sheets_rows_dicts[dict_batch_sheet[True]].append(batch_row_dict)

        return [dict_sheets_rows_dicts[sheet["name"]] for sheet in template["sheets info"]]