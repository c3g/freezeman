from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import ExperimentRun
from fms_core.serializers import ExperimentRunSerializer, ExperimentRunExportSerializer

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

    @action(detail=True, methods=["get"])   # TODO should this be post? update?
    def launch_run_processing(self, _request, pk=None):
        try:
            experiment_run = ExperimentRun.objects.get(pk=pk)
        except ExperimentRun.DoesNotExist:
            return Response(status=404, data= {
                'ok': False,
                'message': f'Experiment run with id {pk} not found.'
            })

        # TODO Create a service to launch experiment runs
        # raise Exception('Test Error')
     
        # TODO Decide on what information the response should contain
        return Response({
            'ok': True,
            'message': 'Experiment run launched successfully'
        })