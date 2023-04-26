from django.db.models import Q

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from fms_core.models import Coordinate
from fms_core.serializers import CoordinateSerializer

from ._constants import _coordinate_filterset_fields


class CoordinateViewSet(viewsets.ModelViewSet):
    queryset = Coordinate.objects.all()
    serializer_class = CoordinateSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_coordinate_filterset_fields,
    }

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for coordinates that match the given query
        """
        search_input = _request.GET.get("q")
        is_exact_match = _request.GET.get("exact_match") == 'true'

        if search_input:
            if is_exact_match:
                query = Q(id=search_input)
                query.add(Q(name=search_input), Q.OR)
            else:
                query = Q(name__icontains=search_input)
            coordinates_data = Coordinate.objects.filter(query)
        else:
            coordinates_data = Coordinate.objects.all()
        page = self.paginate_queryset(coordinates_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)