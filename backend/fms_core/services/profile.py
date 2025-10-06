from collections import defaultdict
from fms_core.models import Profile, FreezemanUser
from fms_core.schema_validators import PREFERENCES_VALIDATOR

def get_default_profile() -> Profile:
    return Profile.objects.get(name="Default")

def get_profile(user_id: int) -> Profile:
    from fms_core.services.freezeman_user import get_or_create_freezeman_user
    fm_user = get_or_create_freezeman_user(user_id)
    return fm_user.profile

def update_preferences(user_id: int, new_preferences: dict) -> tuple[Profile, list[str], list[str]]:
    from fms_core.services.freezeman_user import get_or_create_freezeman_user
    fm_user = get_or_create_freezeman_user(user_id)

    errors = []
    warnings = []

    for error in PREFERENCES_VALIDATOR.validator.iter_errors(new_preferences):
        path = "".join(f'["{p}"]' for p in error.path)
        errors.append(f"{path}: {error.message}" if error.path else error.message)
    if errors:
        return fm_user.profile, errors, warnings

    profile = fm_user.profile

    old_preferences = profile.final_preferences()
    updated_preferences = {}
    for key, new_value in new_preferences.items():
        if new_value != old_preferences[key]:
            updated_preferences[key] = new_value

    if updated_preferences:
        if not profile.parent:
            profile = Profile.objects.create(
                name=fm_user.username,
                parent=profile,
                preferences=updated_preferences,
            )

        # Remove any new preferences that are the same as the parent's preferences
        for k, v in profile.parent.preferences.items():
            if updated_preferences.get(k) == v:
                del updated_preferences[k]

        profile.preferences = updated_preferences
        profile.save()

        fm_user.profile = profile
        fm_user.save()

    return profile, errors, warnings