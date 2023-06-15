from django.db.models import Q
from django.core.exceptions import ValidationError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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


    def create(self, request, *args, **kwargs):
        taxon_data = request.data
        try:
            taxon = Taxon.objects.create(ncbi_id = taxon_data["ncbi_id"], name = taxon_data["name"])
            serializer = TaxonSerializer(taxon)
        except ValidationError as err:
            raise ValidationError(err)
        
        return Response(serializer.data)
    
    
    def update(self, request, *args, **kwargs):
        taxon_data = request.data
        
        try:
            taxon_to_update = Taxon.objects.select_for_update().get(pk=taxon_data['id'])
            taxon_to_update.__dict__.update(taxon_data)
            serializer = TaxonSerializer(taxon_to_update)
        except Exception as err:
            raise ValidationError(dict(non_field_errors=err))
        
        try:
            taxon_to_update.save()
        except Exception as err:
            raise ValidationError(err)
        
        return Response(serializer.data)

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
            query.add(Q(name__icontains=search_input), Q.OR)
            query.add(Q(ncbi_id__icontains=search_input), Q.OR)

        taxons_data = Taxon.objects.filter(query)
        page = self.paginate_queryset(taxons_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)