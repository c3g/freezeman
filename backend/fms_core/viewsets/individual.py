from django.db.models import Q
from django.contrib.auth.models import User

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.models import Individual
from fms_core.serializers import IndividualSerializer
from fms_core.filters import IndividualFilter

from ._utils import TemplateActionsMixin, versions_detail
from ._constants import _individual_filterset_fields


class IndividualViewSet(viewsets.ModelViewSet):
    queryset = Individual.objects.all()
    serializer_class = IndividualSerializer
    filter_class = IndividualFilter

    # noinspection PyUnusedLocal
    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        return versions_detail(self.get_object())

    @action(detail=False, methods=["get"])
    def list_export(self, _request):
        serializer = IndividualSerializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for individuals that match the given query
        """
        search_input = _request.GET.get("q")
        is_exact_match = _request.GET.get("exact_match") == 'true'

        if is_exact_match:
            query = Q(id=search_input)
            query.add(Q(name=search_input), Q.OR)
        else:
            query = Q(id__icontains=search_input)
            query.add(Q(name__startswith=search_input), Q.OR)

        individuals_data = Individual.objects.filter(query)
        page = self.paginate_queryset(individuals_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)