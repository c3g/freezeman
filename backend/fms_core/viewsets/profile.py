from rest_framework import viewsets
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.permissions import IsAuthenticated

from django.core.exceptions import ValidationError

from fms_core.models import FreezemanUser, Profile
from fms_core.serializers import ProfileSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def retrieve(self, _request, pk, *args, **kwargs):
        fm_user = FreezemanUser.objects.filter(user__id=pk).get()
        serializer = self.get_serializer(fm_user.profile)
        return Response(serializer.data)

    def list(self, _request, *args, **kwargs):
        # Why on earth would you want to list all profiles?
        raise MethodNotAllowed("GET")