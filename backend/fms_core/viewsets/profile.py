from rest_framework import viewsets
from rest_framework.exceptions import bad_request
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.core.exceptions import ValidationError

from fms_core.services.profile import get_profile, update_preferences
from fms_core.schema_validators import PREFERENCES_VALIDATOR
from fms_core.models import FreezemanUser, Profile
from fms_core.serializers import ProfileSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ["get", "head", "options", "patch"]

    def retrieve(self, _request, pk, *args, **kwargs):
        # user with id=pk is assumed to exist
        serializer = self.get_serializer(get_profile(int(pk)))
        return Response(serializer.data)

    def list(self, _request, *args, **kwargs):
        # Why on earth would you want to list all profiles?
        return bad_request(_request, "Listing all profiles is not allowed.")
    
    def partial_update(self, request, pk, *args, **kwargs):
        # user with id=pk is assumed to exist
        data = request.data
        profile, errors, warnings = update_preferences(int(pk), data["preferences"])
        if errors:
            raise ValidationError({"preferences": errors})
        serializer = self.get_serializer(profile)
        return Response(serializer.data)