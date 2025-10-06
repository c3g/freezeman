from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.http import QueryDict

from rest_framework import viewsets
from rest_framework.exceptions import bad_request
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from fms_core.services.profile import get_profile_by_name, update_profile_preferences
from fms_core.schema_validators import PREFERENCES_VALIDATOR
from fms_core.models import FreezemanUser, Profile
from fms_core.serializers import ProfileSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ['get', 'post', 'head', 'options', 'trace']

    def retrieve(self, _request, pk, *args, **kwargs):
        return Response(bad_request(_request, "Fetch individual profile via /profile/?user_id=USER_ID"))

    def list(self, _request, *args, **kwargs):
        params = QueryDict(self.request.META.get('QUERY_STRING'))
        user_id = params.get("user_id")
        if not user_id:
            raise ValidationError({"user_id": "user_id parameter is required"})
        name = get_user_model().objects.get(id=user_id).username
        profile = get_profile_by_name(name)
        return Response(self.get_serializer(profile).data)
    
    def update(self, request, *args, **kwargs):
        params = QueryDict(self.request.META.get('QUERY_STRING'))
        user_id = params.get("user_id")
        if not user_id:
            raise ValidationError({"profile_id": "profile_id parameter is required"})

        data = request.data
        profile, errors, _ = update_profile_preferences(int(user_id), data["preferences"])
        if errors:
            raise ValidationError({"preferences": errors})
        serializer = self.get_serializer(profile)
        return Response(serializer.data)