from fms_core.models import FreezemanUser

def get_or_create_freezeman_user(user_id: int) -> FreezemanUser:
    from fms_core.services.profile import get_default_profile
    try:
        fm_user = FreezemanUser.objects.filter(user__id=user_id).get()
    except FreezemanUser.DoesNotExist:
        fm_user = FreezemanUser.objects.create(
            user_id=user_id,
            profile=get_default_profile(),
        )
    return fm_user