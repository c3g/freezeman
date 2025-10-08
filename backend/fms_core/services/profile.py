from fms_core.models import Profile, FreezemanUser
from fms_core.schema_validators import PREFERENCES_VALIDATOR


# def update_user_profile(*, user_id: int | None = None, username: str | None = None, preferences: dict | None = None) -> tuple[Profile, list[str], list[str]]:
#     """
#     Update the profile for a user identified by either `user_id` or `name`.
#     Do not use this to update a profile that is not associated with a single user.
#     """
#     errors = []
#     warnings = []

#     if user_id is not None:
#         fm_user = FreezemanUser.objects.get(user_id=user_id)
#     elif username is not None:
#         fm_user = FreezemanUser.objects.get(username=username)
#     else:
#         raise Exception("Either user_id or username must be provided")

#     if preferences is not None:
#         preferences = dict(preferences)

#         for error in PREFERENCES_VALIDATOR.validator.iter_errors(preferences):
#             path = "".join(f'["{p}"]' for p in error.path)
#             errors.append(f"{path}: {error.message}" if error.path else error.message)
#         if errors:
#             return fm_user.profile, errors, warnings

#         parent_profile = fm_user.profile.parent if fm_user.profile.parent else fm_user.profile
#         # Remove any new preferences that are the same as the parent's preferences
#         # parent should have all preference settings
#         for k, v in parent_profile.preferences.items():
#             if k in preferences and preferences[k] == v:
#                 del preferences[k]

#         if not preferences and fm_user.profile.parent is None:
#             # don't update user preferences if the user hasn't personalized yet anyway which means they stuck with default
#             return fm_user.profile, errors, warnings

#         if fm_user.profile.parent is None:
#             # create a personalized version of the profile
#             fm_user.profile = Profile.objects.create(
#                 name=f"{fm_user.username}",
#                 parent=fm_user.profile,
#                 preferences={}
#             )
#         fm_user.profile.preferences = preferences
#         fm_user.profile.save()

#         fm_user.save()

#     return fm_user.profile, errors, warnings