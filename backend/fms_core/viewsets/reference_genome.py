from django.db.models import Q

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from fms_core.models import ReferenceGenome
from fms_core.serializers import ReferenceGenomeSerializer
from django.core.exceptions import ValidationError
from rest_framework.response import Response

from ._constants import _reference_genome_filterset_fields


class ReferenceGenomeViewSet(viewsets.ModelViewSet):
    queryset = ReferenceGenome.objects.all()
    serializer_class = ReferenceGenomeSerializer
    permission_classes = [IsAuthenticated]

    filterset_fields = {
        **_reference_genome_filterset_fields,
    }
    def create(self, request, *args, **kwargs):
        referenceGenome_data = request.data

        try:
            referenceGenome = ReferenceGenome.objects.create(
                assembly_name = referenceGenome_data["assembly_name"], 
                synonym = referenceGenome_data["synonym"], 
                taxon_id =  referenceGenome_data["taxon_id"],
                size = referenceGenome_data["size"],
                genbank_id = referenceGenome_data["genbank_id"],
                refseq_id = referenceGenome_data["refseq_id"])
            serializer = ReferenceGenomeSerializer(referenceGenome)
        except Exception as err:
            raise ValidationError(err)
        else:
            return Response(serializer.data)


    def update(self, request, *args, **kwargs):
        referenceGenome_data = request.data

        try:
            referenceGenome_to_update = ReferenceGenome.objects.select_for_update().get(pk=referenceGenome_data['id'])
            referenceGenome_to_update.__dict__.update(referenceGenome_data)
        except Exception as err:
            raise ValidationError(dict(non_field_errors=err))

        try:
            serializer = ReferenceGenomeSerializer(referenceGenome_data)
            referenceGenome_to_update.save()
        except Exception as err:
            raise ValidationError(err)

        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def search(self, _request):
        """
        Searches for reference genome that match the given query
        """
        search_input = _request.GET.get("q")
        is_exact_match = _request.GET.get("exact_match") == 'true'

        if is_exact_match:
            query = Q(id=search_input)
            query.add(Q(name=search_input), Q.OR)
        else:
            query = Q(id__icontains=search_input)
            query.add(Q(assembly_name__icontains=search_input), Q.OR)
            query.add(Q(synonym__icontains=search_input), Q.OR)

        reference_genome_data = ReferenceGenome.objects.filter(query)
        page = self.paginate_queryset(reference_genome_data)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)