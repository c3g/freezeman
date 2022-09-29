from fms_core.services.sample_lineage import create_sample_lineage_graph
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError


class SampleLineageViewSet(viewsets.ViewSet):
    @action(detail=True, methods=["get"])
    def graph(self, _request, pk: int) -> Response:
        """
        Generates a sample lineage that is acyclical where each node is a sample and each edge is a process.
        For more information, visit `fms_core.services.sample_lineage.create_sample_lineage_graph`.

        Args:
            `_request`: ignored

            `pk`: ID of an existing sample

        Returns:
            `Response` object consisting of `"nodes"` and `"edges"`

        Raises:
            `ValidationError`: the ID corresponds to a sample that does not exist.
        """

        nodes, edges, errors = create_sample_lineage_graph(pk)

        if errors:
            raise ValidationError(errors)
        else:
            return Response({
                "nodes": nodes,
                "edges": edges,
            })
