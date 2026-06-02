from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from fms_core.serializers import ProjectOverviewReadsetMetricSerializer
from fms_core.services.project_overview.readsets import get_project_overview_readsets_by_external_id


class ProjectOverviewViewSet(viewsets.ViewSet):
    def _get_external_id(self, request):
        external_id = request.query_params.get("external_id")

        if not external_id:
            return None, Response(
                {"external_id": "This query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return external_id, None

  
    @action(detail=False, methods=["get"])
    def readsets(self, request):
        external_id, error_response = self._get_external_id(request)
        if error_response:
            return error_response

        readsets = get_project_overview_readsets_by_external_id(external_id)
        serializer = ProjectOverviewReadsetMetricSerializer(readsets, many=True)

        return Response(serializer.data)


