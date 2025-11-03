from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.http import QueryDict

from rest_framework import viewsets
from rest_framework.exceptions import bad_request
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# from fms_core.services.profile import get_profile_by_name, update_user_profile
from fms_core.schema_validators import PREFERENCES_VALIDATOR
from fms_core.models import FreezemanUser, Profile
from fms_core.serializers import ProfileSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
