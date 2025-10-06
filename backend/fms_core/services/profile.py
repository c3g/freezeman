from fms_core.services.freezeman_user import get_freezeman_user
from fms_core.models import Profile, FreezemanUser
from fms_core.schema_validators import PREFERENCES_VALIDATOR

def get_profile_by_name(name = "Default") -> Profile:
    return Profile.objects.get(name=name)

def get_profile_by_user_id(user_id: int) -> Profile:
    fm_user = get_freezeman_user(user_id)
    return fm_user.profile

def update_profile_preferences(user_id: int, new_preferences: dict) -> tuple[Profile, list[str], list[str]]:
    new_preferences = dict(new_preferences)
    fm_user = get_freezeman_user(user_id)

    errors = []
    warnings = []

    for error in PREFERENCES_VALIDATOR.validator.iter_errors(new_preferences):
        path = "".join(f'["{p}"]' for p in error.path)
        errors.append(f"{path}: {error.message}" if error.path else error.message)
    if errors:
        return fm_user.profile, errors, warnings

    parent_profile = fm_user.profile.parent if fm_user.profile.parent else fm_user.profile
    # Remove any new preferences that are the same as the parent's preferences
    # parent should have all preference settings
    for k, v in parent_profile.preferences.items():
        if new_preferences.get(k, None) == v:
            del new_preferences[k]

    if not new_preferences and fm_user.profile.parent is None:
        # don't update user preferences if the user hasn't personalized yet anyway which means they stuck with default
        return fm_user.profile, errors, warnings

    if fm_user.profile.parent is None:
        fm_user.profile = Profile.objects.create(
            name=f"{fm_user.username}",
            parent=fm_user.profile,
            preferences=new_preferences
        )
    fm_user.profile.preferences = new_preferences

    fm_user.profile.save()
    fm_user.save()

    return fm_user.profile, errors, warnings