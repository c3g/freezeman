from dataclasses import asdict
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponseServerError

from fms_core.models import ExperimentRun
from fms_core.serializers import ExperimentRunSerializer, ExperimentRunExportSerializer
from fms_core.services.experiment_run import start_experiment_run_processing, get_run_info_for_experiment

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