from collections import defaultdict
from fms_core.models.preference_setting import PreferenceSetting
from django.db import transaction


def set_preference(user: None | str, key: str, value: str) -> tuple[PreferenceSetting, list[str], list[str]]:
    errors = []
    warnings = []

    preference, _ = PreferenceSetting.objects.get_or_create(user=user, key=key)
    preference.value = value
    try:
        preference.save()
    except Exception as e:
        errors.append(str(e))
    return preference, errors, warnings

def set_preferences(user: None | str, preferences: dict[str, str]) -> tuple[list[PreferenceSetting], dict[str, list[str]], dict[str, list[str]]]:
    updated_preferences = list[PreferenceSetting]()
    errors = defaultdict(list[str])
    warnings = defaultdict(list[str])

    for key, value in preferences.items():
        preference, pref_errors, pref_warnings = set_preference(user, key, value)
        updated_preferences.append(preference)
        if pref_errors:
            errors[key].extend(pref_errors)
        if pref_warnings:
            warnings[key].extend(pref_warnings)

    return updated_preferences, errors, warnings

def get_preference(user: None | str, key: str) -> None | PreferenceSetting:
    try:
        PreferenceSetting.objects.get(user=user, key=key)
    except PreferenceSetting.DoesNotExist as e:
        if user is not None:
            return PreferenceSetting.objects.get(user=None, key=key)
        else:
            raise e

def get_all_preferences(user: None | str) -> dict[str, PreferenceSetting]:
    settings = dict(
        (setting.option.name, setting) for setting in PreferenceSetting.objects.filter(user=None)
    )
    if user is not None:
        for setting in PreferenceSetting.objects.filter(user=user):
            settings[setting.option.name] = setting
    return settings