from fms_core.models.profile import Profile
from fms_core.models import FreezemanUser

from django.contrib.auth import get_user_model

def get_freezeman_user(django_user_id: int) -> FreezemanUser:
    return FreezemanUser.objects.get(user__id=django_user_id)

def create_freezeman_user(django_user_id: int, profile: Profile):
    return FreezemanUser.objects.create(user=get_user_model().objects.get(id=django_user_id), profile=profile)