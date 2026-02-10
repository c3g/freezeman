from typing import Any, Dict, Tuple, TypedDict, Union, List
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db.models import CharField, Func, Value
from django.db import transaction
from django.http import HttpResponseBadRequest, HttpResponse
from django.conf import settings
from django.core.exceptions import ValidationError

from rest_framework.decorators import action
from rest_framework.response import Response
from reversion.models import Version

import json
import os

from fms_core.template_importer.importers._generic import GenericImporter
from fms_core.templates import TemplateIdentity
from fms_core import automations
from fms_core.serializers import VersionSerializer
from fms_core.template_prefiller.prefiller import PrefillTemplate, PrefillTemplateFromDict
from fms_core.models import Sample, Protocol, Step, StepSpecification
from fms_core.services.sample_next_step import execute_workflow_action
from fms_core._constants import WorkflowAction
from fms_core.utils import has_errors

def versions_detail(obj):
    versions = Version.objects.get_for_object(obj)
    serializer = VersionSerializer(versions, many=True)
    return Response(serializer.data)


def _prefix_keys(prefix: str, d: Dict[str, Any]) -> Dict[str, Any]:
    return {prefix + k: v for k, v in d.items()}

def _list_keys(d: Dict[str, Any]) -> Dict[str, Any]:
    return [k  for k, v in d.items()]


class FZY(Func):
    template = "%(function)s(%(expressions)s::cstring)"
    function = "fzy"

    def __init__(self, search_term, search_field, **extras):
        super(FZY, self).__init__(
            Value(search_term, output_field=CharField()),
            search_field,
            **extras
        )

class AutomationsMixin:
    # Automation are defined in their workflow step specification.
    # To launch an automation we only require the step id and the parameters from the request are forwarded to the automation.

    @transaction.atomic
    @action(detail=False, methods=["post"])
    def execute_automation(self, request):
        """
        Execute the automation class listed in the step_specification named AutomationClass.
        The request must include a step_id and a filter to identify the samples that are to be moved forward on the workflow.

        Args:
            `self`: Viewset with a queryset containing a sample_id.
            `request`: API request for Automation execution. Include step_id and filters to identify samples.
        Return:
            A dictionary with:
                `result`:  `success`: Success boolean of the automation execution.
                           `data`: Additional data to be returned to the requester. Optional. None if not required.
                `errors`: Error list.
                `warnings`: Warning list.
        """
        errors = {}
        warnings = {}
        result = {"success": False, "data": None}
        step_id = request.POST.get("step_id")
        additional_data = json.loads(request.POST.get("additional_data"))
        if step_id is not None:
            automation_class_name = StepSpecification.objects.filter(step_id=step_id, name="AutomationClass").values_list("value", flat=True)[0]
            if automation_class_name is not None:
                queryset = self.filter_queryset(self.get_queryset())
                sample_ids = queryset.values_list("sample_id", flat=True)
                automation = getattr(automations, automation_class_name)()              # Instantiate
                result, errors, warnings = automation.execute(sample_ids=sample_ids, additional_data=additional_data)    # Execute
                # if no errors move to next worflow step
                if len(errors) == 0:
                    samples = Sample.objects.filter(id__in=sample_ids).all()
                    try:
                        step = Step.objects.get(id=step_id)
                    except Step.DoesNotExist:
                        errors.append(f"No step matches the requested automation step ID {step_id}.")
                    for current_sample in samples:
                        errors_workflow, warnings_workflow = execute_workflow_action(workflow_action=WorkflowAction.NEXT_STEP.label,
                                                                                     step=step,
                                                                                     current_sample=current_sample)
                        errors["workflow"].extend(errors_workflow)
                        warnings["workflow"].extend(warnings_workflow)
                    result["success"] = True
            else:
                errors["Automation Class"] = f"Automation class not found for step ID {step_id}."
        else:
            errors["Step ID"] = f"Missing step ID for automation."

        if has_errors(errors):
            result["success"] = False
            transaction.set_rollback(True)

        results = { 
                "result": result,
                "errors": errors,
                "warnings": warnings,
        }
        return Response(results)

class TemplateActionDefinition(TypedDict):
    name: str
    description: str
    template: list[TemplateIdentity]
    importer: type[GenericImporter]

class TemplateActionsMixin:
    # When this mixin is used, this list will be overridden to provide a list
    # of template actions for the viewset implementation.
    template_action_list: list[TemplateActionDefinition] = []

    @classmethod
    def _get_action(cls, request) -> Tuple[bool, Union[str, Tuple[TemplateActionDefinition, InMemoryUploadedFile]]]:
        """
        Gets template action from request data. Requests should be
        multipart/form-data, with two key-value pairs:
            action: index of the template action (based on the list provided by template_actions/)
            template: completed template file with data
        Returns a tuple of:
            bool
                True if an error occurred, False if the request was processed
                to the point of reading the file into a InMemoryUploadedFile.
            Union[str, Tuple[dict, InMemoryUploadedFile]]
                str if an error occured, where the string is the error message.
                InMemoryUploadedFile otherwise, with the contents of the uploaded file.
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
                template = template.copy() # avoid modifying the original dict
                current_template_protocol_name = template.get("protocol", None)
                if protocol and current_template_protocol_name and protocol.name != current_template_protocol_name:
                    pass
                else:
                    file = template.get("file", None)
                    template["file"] = request.build_absolute_uri(template["file"]) if file is not None else file # Return the file as an URI
                    if "workbook" in template:
                        del template["workbook"] # Remove the "workbook" key since it contains function
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
        # error being true and action_data being string indicates error from self._get_action
        if error or isinstance(action_data, str):
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
                template_dict["prefillFields"] = template["template"]["user prefill info"] if ("user prefill info" in template["template"]) else None
                templates_list.append(template_dict)
        return Response(templates_list)

    @action(detail=False, methods=["post"])
    def prefill_template(self, request):
        """
        Endpoint off of the parent viewset for filling up the requested template and returning it.
        """
        template_id = request.POST.get("template")
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
    def _prepare_prefill_dicts(cls, template, queryset, **kwargs) -> List:
        # Virtual method for dicts building. Surdefine in child class to specify.
        return []

    @action(detail=False, methods=["post"])
    def prefill_template(self, request):
        """
        Endpoint off of the parent viewset for filling up the requested template using a field dict and returning it.
        """
        template_id = request.POST.get("template")
        user_prefill_data = json.loads(request.POST.get("user_prefill_data"))
        placement_data = json.loads(request.POST.get("placement_data")) if request.POST.get("placement_data") is not None else None

        try:
            template = self.template_prefill_list[int(template_id)]["template"]
        except (KeyError, ValueError):
            # If the template index is out of bounds or not int-castable, return an error.
            return HttpResponseBadRequest(json.dumps({"detail": f"Template {template_id} not found"}), content_type="application/json")

        queryset = self.filter_queryset(self.get_queryset())

        if not user_prefill_data and not template["prefill info"]:
            return HttpResponseBadRequest(json.dumps({"detail": f"No prefilling available for current template."}), content_type="application/json")
        else:
            try:
                rows_dicts = self._prepare_prefill_dicts(template, queryset, user_prefill_data, placement_data)
                prefilled_template = PrefillTemplateFromDict(template, rows_dicts)
            except ValidationError as err:
                return HttpResponseBadRequest(json.dumps({"detail": err.messages}), content_type="application/json")
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
    def _prepare_prefill_dicts(cls, template, queryset, user_prefill_data, placement_data) -> List:
        
        def default_prefilling(sample: Sample, template, user_prefill_data):
            sample_row_dict = {}
            # Use sample to extract the sample information guided by the template definition prefill info.
            for _, column_name, _, attribute, func in template["prefill info"]:
                if func:
                    value = func(getattr(sample, attribute))
                else:
                    value = getattr(sample, attribute)
                sample_row_dict[column_name] = value
            # Insert user inputted info to prefill template
            if user_prefill_data:
                for column_name, value in user_prefill_data.items():
                    sample_row_dict[column_name] = value
            return sample_row_dict
        
        def default_batch_prefilling(sample_id_list: List[int], template, batch_sheet_name, user_prefill_data):
            # Get the list of attributes to group by (prefill[0] = sheet_name, prefill[2] = queryset_name)
            batch_attributes_names = [prefill[2] for prefill in template["prefill info"] if prefill[0] == batch_sheet_name]
            matching_column_names = [prefill[1] for prefill in template["prefill info"] if prefill[0] == batch_sheet_name]
            queryset = Sample.objects.filter(id__in = sample_id_list).values(*batch_attributes_names).distinct()

            batch_rows_list = []
            for entry in queryset:
                batch_row_dict = {}
                for i, attribute_name in enumerate(batch_attributes_names):
                    batch_row_dict[matching_column_names[i]] = entry[attribute_name]
                # Insert user inputted info to prefill template
                if user_prefill_data:
                    for column_name, value in user_prefill_data.items():
                        batch_row_dict[column_name] = value
                batch_rows_list.append(batch_row_dict)

            return batch_rows_list

        def get_step_specific_experiment_prefix(step_name: str):
            match step_name:
                case "Experiment Run Infinium":
                    return ""
                case _:
                    return "CHANGE ME "

        AXIOM_EXPERIMENT_STEP = "Experiment Run Axiom"

        # Create the dictionnary used for prefilling using template definition and step specs. Tolerate templates with 2 sheets max.
        dict_sheets_rows_dicts = {sheet["name"]: [] for sheet in template["sheets info"]} # Initialize each sheet list

        # Dictionary to identify the sample sheet and the batch sheet
        dict_batch_sheet = {sheet.get("batch"): sheet["name"] for sheet in template["sheets info"] if sheet.get("batch", None) is not None}
        extra_sheet_list = [sheet["name"] for sheet in template["sheets info"] if sheet.get("batch", None) is None]
        # Dictionary to map a sheet to its stitch column
        dict_stitch = {sheet["name"]: sheet.get("stitch_column", None) for sheet in template["sheets info"]}
        # Process case where we have a single batch sheet template without a matching sample sheet
        if dict_batch_sheet.get(False, None) is None and dict_batch_sheet.get(True, None) is not None and dict_stitch[dict_batch_sheet[True]] is None:
            sample_id_list, step_id_list = zip(*queryset.values_list("sample", "step"))
            batch_rows_list = default_batch_prefilling(sample_id_list, template, dict_batch_sheet[True], user_prefill_data)
            # Add step specifications
            step_count = len(set(step_id_list))
            if step_count > 1:
                raise ValidationError(f"Batched sample processing requested for multiples steps simultaneously.")
            elif step_count > 0:
                step = Step.objects.get(id=step_id_list[0])
                for spec in step.step_specifications.all():
                    for batch_row_dict in batch_rows_list:
                        batch_row_dict[spec.column_name] = spec.value
            
            dict_sheets_rows_dicts[dict_batch_sheet[True]] = batch_rows_list
        else:
            step_dict = {}
            batch_container_dict = {}
            for sample_id, step_id in queryset.values_list("sample", "step").distinct():
                new_step = False
                new_batch_container = False
                sample = Sample.objects.get(id=sample_id)
                # without placement there is only 1 destination for each sample
                if placement_data is None or placement_data.get(str(sample_id)) is None:
                    sample_row_dict = default_prefilling(sample, template, user_prefill_data)
                    batch_row_dict = {}
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
                    # Extra prefilling step for Axiom experiment - get experiment container barcode from comment
                    if step.name == AXIOM_EXPERIMENT_STEP:
                        # Replace stitch fields by source container name
                        sample_row_dict[dict_stitch[dict_batch_sheet.get(False, None)]] = sample.container_name
                        if not batch_container_dict.get(sample.container_name, None):
                            batch_row_dict[dict_stitch[dict_batch_sheet.get(True, None)]] = sample.container_name
                            batch_prefill_info = [prefill for prefill in template["prefill info"] if prefill[0] == dict_batch_sheet.get(True, None)] # prefill[0] is the template sheet name
                            # Get batch field value
                            for _, column_name, _, attribute, func in batch_prefill_info:
                                value = getattr(sample, attribute)
                                batch_row_dict[column_name] = func(value) if func else value
                            batch_container_dict[sample.container_barcode] = sample.container_barcode # share the dict
                    # Append current rows to the dict for the sample sheet
                    dict_sheets_rows_dicts[dict_batch_sheet[False]].append(sample_row_dict)
                    # Append current rows to the dict for the extra sheets
                    for sheet_name in extra_sheet_list:
                        dict_sheets_rows_dicts[sheet_name].append(sample_row_dict) # make sure there is no duplicate in column name or this would cause issues
                    if batch_row_dict:
                        dict_sheets_rows_dicts[dict_batch_sheet[True]].append(batch_row_dict)

                # Insert placement information for prefill template to wllo multiple destination during prefilling
                else:
                    sample_id = str(sample_id)
                    for placement in placement_data[sample_id]:
                        # for each placement collect basic prefilling
                        sample_row_dict = default_prefilling(sample, template, user_prefill_data)
                        batch_row_dict = {}
                        step = Step.objects.get(id=step_id)
                        for sheet_name, column_name, identifier in template["placement info"]:
                            if sheet_name == dict_batch_sheet.get(False, sheet_name): # Sheet defaults to sample sheet
                                sample_row_dict[column_name] = placement[identifier]
                            else:
                                if dict_stitch.get(sheet_name, None):
                                    sample_row_dict[dict_stitch[sheet_name]] = get_step_specific_experiment_prefix(step.name) + placement["container_barcode"]
                                if not batch_container_dict.get(placement["container_barcode"], None):
                                    if dict_stitch.get(sheet_name, None):
                                        batch_row_dict[dict_stitch[sheet_name]] = get_step_specific_experiment_prefix(step.name) + placement["container_barcode"]
                                    batch_row_dict[column_name] = placement[identifier]
                                    new_batch_container = True
                        if new_batch_container:
                            batch_container_dict[placement["container_barcode"]] = placement["container_barcode"]
                        # Use step to extract specifications and attach it to the correct sheet and column
                        for spec in step.step_specifications.all():
                            if spec.sheet_name == dict_batch_sheet.get(False, spec.sheet_name): # Sheet defaults to sample sheet
                                sample_row_dict[spec.column_name] = spec.value
                            else:
                                if dict_stitch.get(spec.sheet_name, None) and sample_row_dict.get(dict_stitch[spec.sheet_name]) is None:
                                    sample_row_dict[dict_stitch[spec.sheet_name]] = step.name # User will need to split batches further if needed
                                if not step_dict.get(step.id, None):
                                    if dict_stitch.get(spec.sheet_name, None) and sample_row_dict.get(dict_stitch[spec.sheet_name]) == step.name:
                                        batch_row_dict[dict_stitch[spec.sheet_name]] = step.name # User will need to split batches further if needed
                                    batch_row_dict[spec.column_name] = spec.value
                                    new_step = True
                        if new_step:
                            step_dict[step.id] = step
                        # Extra prefilling step for Axiom experiment - get experiment container barcode from comment
                        if step.name == AXIOM_EXPERIMENT_STEP:
                            # Replace stitch fields by source container name
                            sample_row_dict[dict_stitch[dict_batch_sheet.get(False, None)]] = sample.container_name
                            if not batch_container_dict.get(sample.container_name, None):
                                batch_row_dict[dict_stitch[dict_batch_sheet.get(True, None)]] = sample.container_name
                                batch_prefill_info = [prefill for prefill in template["prefill info"] if prefill[0] == dict_batch_sheet.get(True, None)] # prefill[0] is the template sheet name
                                # Get batch field value
                                for _, column_name, _, attribute, func in batch_prefill_info:
                                    if func:
                                        value = func(getattr(sample, attribute))
                                    else:
                                        value = getattr(sample, attribute)
                                    batch_row_dict[column_name] = value
                                batch_container_dict[sample.container_barcode] = sample.container_barcode # share the dict

                        # Append current rows to the dict for the sample sheet
                        dict_sheets_rows_dicts[dict_batch_sheet[False]].append(sample_row_dict)
                        # Append current rows to the dict for the extra sheets
                        for sheet_name in extra_sheet_list:
                            dict_sheets_rows_dicts[sheet_name].append(sample_row_dict) # make sure there is no duplicate in column name or this would cause issues
                        if batch_row_dict:
                            dict_sheets_rows_dicts[dict_batch_sheet[True]].append(batch_row_dict)

        return [dict_sheets_rows_dicts[sheet["name"]] for sheet in template["sheets info"]]
