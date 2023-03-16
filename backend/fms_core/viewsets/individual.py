from django.db.models import Q
from django.contrib.auth.models import User

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import Individual
from fms_core.serializers import IndividualSerializer, IndividualExportSerializer
from fms_core.filters import IndividualFilter

from ._utils import TemplateActionsMixin, versions_detail, _list_keys
from ._constants import _individual_filterset_fields


class IndividualViewSet(viewsets.ModelViewSet):
    queryset = Individual.objects.select_related("taxon").all()
    serializer_class = IndividualSerializer
    ordering_fields = (
        *_list_keys(_individual_filterset_fields),
    )
    filterset_class = IndividualFilter

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = IndividualExportSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    def get_renderer_context(self):
        context = super().get_renderer_context()
        if self.action == 'list_export':
            fields = IndividualExportSerializer.Meta.fields
            context['header'] = fields
            context['labels'] = {i: i.replace('_', ' ').capitalize() for i in fields}
        return context

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for individuals that match the given query
        """
        search_input = _request.GET.get("q")
        is_exact_match = _request.GET.get("exact_match") == 'true'

        if search_input:
            if is_exact_match:
                query = Q(id=search_input)
                query.add(Q(name=search_input), Q.OR)
            else:
                query = Q(id__icontains=search_input)
                query.add(Q(name__startswith=search_input), Q.OR)
            individuals_data = Individual.objects.filter(query)
        else:
            individuals_data = Individual.objects.all()
        page = self.paginate_queryset(individuals_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)