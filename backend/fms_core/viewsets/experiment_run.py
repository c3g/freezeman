from dataclasses import asdict
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponseServerError
from django.db.models import OuterRef, Subquery

from fms_core.models import ExperimentRun, Dataset
from fms_core.serializers import ExperimentRunSerializer, ExperimentRunExportSerializer, ExternalExperimentRunSerializer
from fms_core.services.experiment_run import (start_experiment_run_processing,
                                              get_run_info_for_experiment,
                                              set_run_processing_start_time,
                                              set_run_processing_end_time)
from fms_core.services.dataset import  set_experiment_run_lane_validation_status

from ._utils import TemplateActionsMixin, _list_keys
from ._constants import _experiment_run_filterset_fields



class ExperimentRunViewSet(viewsets.ModelViewSet, TemplateActionsMixin):
    queryset = ExperimentRun.objects.select_related("run_type", "container", "instrument")
    serializer_class = ExperimentRunSerializer
    serializer_export_class = ExperimentRunExportSerializer
    pagination_class = None

    permission_classes = [IsAuthenticated]


    ordering_fields = (
        *_list_keys(_experiment_run_filterset_fields),
    )

    filterset_fields = {
        **_experiment_run_filterset_fields,
    }

    template_action_list = []

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = self.serializer_export_class.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = self.serializer_export_class(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def list_external_experiment_run(self, _request):
        queryset = Dataset.objects.distinct("run_name")
        serializer = ExternalExperimentRunSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def set_run_processing_start_time(self, _request, pk=None):
        _, errors, _ = set_run_processing_start_time(pk)
        if errors:
            response = HttpResponseServerError("\n".join(errors))
        else:
            response = Response("Time set successfully.")
        return response
    
    @action(detail=True, methods=["post"])
    def set_run_processing_end_time(self, _request, pk=None):
        _, errors, _ = set_run_processing_end_time(pk)
        if errors:
            response = HttpResponseServerError("\n".join(errors))
        else:
            response = Response("Time set successfully.")
        return response

    @action(detail=False, methods=["post"])
    def set_experiment_run_lane_validation_status(self, _request):
        run_name = _request.data.get("run_name", None)
        lane = _request.data.get("lane", None)
        validation_status = _request.data.get("validation_status", None)
        validation_status = int(validation_status) if validation_status is not None else None
        count, errors, _ = set_experiment_run_lane_validation_status(run_name=run_name, lane=lane, validation_status=validation_status)
        
        if errors:
            response = HttpResponseServerError("\n".join(errors))
        elif count == 0:
            response = Response("No validation status was set.")
        else:
            response = Response("Validation status set successfully.")
        return response


    @action(detail=True, methods=["patch"])
    def launch_run_processing(self, _request, pk=None):
        '''
        Generates a run info file for an experiment, which triggers run processing
        and sets the experiment's run processing launch time to the current date.

        Args:
            The experiment ID.

        Returns:
            On success:
            {'ok': True}

            On error:
            {'ok': False, message: <error message>}
        '''
        _, errors, _ = start_experiment_run_processing(pk)

        response = None
        if(errors):
            response = HttpResponseServerError("\n".join(errors))
        else:
            response = Response('Launched successfully')
        return response
        
    @action(detail=True, methods=["get"])
    def run_info(self, _request, pk):
        '''
        Generates a RunInfo object for an experiment and returns it to the caller.

        This call does not trigger run processing or modify the experiment in any way.

        Args:
            The experiment ID.

        Returns:
            On success:
            {'ok': True, 'data': <the run info>}

            On error:
            {'ok': False, 'message': <the error message>}
        '''
        run_info, errors, _ = get_run_info_for_experiment(pk)
        if errors:
            response = HttpResponseServerError("\n".join(errors))
        else:
            response = Response(run_info)
        return response