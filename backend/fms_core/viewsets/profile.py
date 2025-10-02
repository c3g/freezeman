from rest_framework import viewsets
from rest_framework.exceptions import bad_request
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.core.exceptions import ValidationError

from fms_core.models import FreezemanUser, Profile
from fms_core.serializers import ProfileSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ["get", "head", "options", "patch"]

    def retrieve(self, _request, pk, *args, **kwargs):
        fm_user = FreezemanUser.objects.filter(user__id=pk).get()
        serializer = self.get_serializer(fm_user.profile)
        return Response(serializer.data)

    def list(self, _request, *args, **kwargs):
        # Why on earth would you want to list all profiles?
        return bad_request(_request, "Listing all profiles is not allowed.")
    
    def partial_update(self, request, pk=None, *args, **kwargs):
        fm_user = FreezemanUser.objects.filter(user__id=pk).get()
        profile: Profile = fm_user.profile
        data = request.data
        try:
            old_preferences = profile.final_preferences()
            new_preferences = {}
            for key, new_value in data["preferences"].items():
                if new_value != old_preferences[key]:
                    new_preferences[key] = new_value
            if new_preferences and profile.parent is None:
                profile = Profile.objects.create(
                    name=fm_user.username,
                    parent=profile,
                    preferences=new_preferences,
                )
            profile.preferences = new_preferences
            profile.save()
            return Response(self.get_serializer(profile).data)
        except Exception as e:
            raise ValidationError({"detail": str(e)})