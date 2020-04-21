from rest_framework.response import Response
from rest_framework.views import APIView

from .info import COMMIT_DATE, COMMIT_HASH, COMMIT_TAGGED_VERSION, COPYRIGHT_YEARS, REPOSITORY, VERSION


__all__ = ["SoftwareInformationView"]


# noinspection PyMethodMayBeStatic,PyUnusedLocal
class SoftwareInformationView(APIView):
    def get(self, request, format=None):
        return Response({
            "commit": {
                "date": COMMIT_DATE,
                "hash": COMMIT_HASH,
                "tagged_version": COMMIT_TAGGED_VERSION,
            },
            "copyright_years": COPYRIGHT_YEARS,
            "repository": REPOSITORY,
            "version": VERSION,
        })
