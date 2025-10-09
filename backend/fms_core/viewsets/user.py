from django.contrib.auth.models import User
from django.contrib.auth.decorators import permission_required
from django.core.exceptions import ValidationError

from rest_framework import viewsets
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, DjangoModelPermissions, IsAdminUser

from fms_core.models import FreezemanUser, Profile
from fms_core.serializers import UserSerializer

from ._constants import _user_filterset_fields

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filterset_fields = _user_filterset_fields

    ordering = ["-is_active", "username"]

    def get_permissions(self):
        if self.action == "update_self":
            permission_classes = [IsAuthenticated]
        elif self.action == "partial_update" or self.action == "update" or self.action == "create" or self.action == "destroy":
            permission_classes = [IsAdminUser]
        else:
            permission_classes = [DjangoModelPermissions]
        return [permission() for permission in permission_classes]

    def partial_update(self, request, *args, **kwargs):
        instance = self.queryset.get(pk=kwargs.get("pk"))
        password = request.data.pop("password", None)
        serializer = self.serializer_class(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if password is not None:
            user.set_password(password)
            user.save()
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        errors = {}
        email = request.data.get("email", None)
        if email and self.queryset.filter(email=email).exists():
            errors["email"] = "User's email is already in use by another user."
        try:
            response = super().create(request, *args, **kwargs)
            user = self.queryset.get(email=email)
            FreezemanUser.objects.create(
                user=user,
                profile=Profile.objects.get(name="Default"),
            )
            response = Response(self.serializer_class(user).data, status=response.status_code)
        except Exception as err:
            errors.update(err.__dict__.get("detail", {"username": "An unexpected error happened."}))
        if errors:
            raise ValidationError(errors)
        else:
            return response

    @action(detail=False, methods=["patch"])
    def update_self(self, request):
        """
        Updates the user's own data, excluding permission fields
        """
        data = request.data
        restricted_fields = ["groups", "is_staff", "is_superuser", "is_active", "username", "email"]
        if any([field in data for field in restricted_fields]):
            return Response({
                "ok": False,
                "detail": "Forbidden field",
            }, status=status.HTTP_403_FORBIDDEN)

        user_id = request.user.id
        data["id"] = user_id
        password = data.pop("password", None)
        instance = self.queryset.get(pk=user_id)
        serializer = self.serializer_class(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        if password is not None:
            user.set_password(password)
            user.save()
        return Response(serializer.data)
