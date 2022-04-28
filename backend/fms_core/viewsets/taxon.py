from django.db.models import Q

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from fms_core.models import Taxon
from fms_core.serializers import TaxonSerializer

from ._constants import _taxon_filterset_fields


class TaxonViewSet(viewsets.ModelViewSet):
    queryset = Taxon.objects.all()
    serializer_class = TaxonSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_taxon_filterset_fields,
    }

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for taxons that match the given query
        """
        search_input = _request.GET.get("q")
        is_exact_match = _request.GET.get("exact_match") == 'true'

        if is_exact_match:
            query = Q(id=search_input)
            query.add(Q(name=search_input), Q.OR)
        else:
            query = Q(id__icontains=search_input)
            query.add(Q(name__startswith=search_input), Q.OR)

        taxons_data = Taxon.objects.filter(query)
        page = self.paginate_queryset(taxons_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)