from rest_framework.response import Response
from rest_framework.views import APIView

from .info import (
    COMMIT_DATE,
    COMMIT_FULL_HASH,
    COMMIT_SMALL_HASH,
    COMMIT_TAGGED_VERSION,
    BRANCH,
    COPYRIGHT_YEARS,
    REPOSITORY,
    VERSION,
)


__all__ = ["SoftwareInformationView"]


# noinspection PyMethodMayBeStatic,PyUnusedLocal
class SoftwareInformationView(APIView):
    def get(self, request, format=None):
        return Response({
            "commit": {
                "date": COMMIT_DATE,
                "hash_full": COMMIT_FULL_HASH,
                "hash_small": COMMIT_SMALL_HASH,
                "tagged_version": COMMIT_TAGGED_VERSION,
            },
            "branch": BRANCH,
            "copyright_years": COPYRIGHT_YEARS,
            "repository": REPOSITORY,
            "version": VERSION,
        })
