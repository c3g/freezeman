from django.test import TestCase

from backend.fms_core.models import Profile, FreezemanUser

from fms_core.services.profile import get_profile_by_name, get_profile_by_user_id, update_profile_preferences
from fms_core.services.freezeman_user import get_freezeman_user

class ProfileServicesTestCase(TestCase):
    def setUp(self) -> None:
        pass

    def test_retrieve_profile_by_name(self):
        profile = get_profile_by_name()
        self.assertIsNotNone(profile)
    
        # first user is assumed to have default profile after migrations
        fm_user = get_freezeman_user(1)
        self.assertEqual(fm_user.profile.pk, profile.pk)

        with self.assertRaises(Profile.DoesNotExist):
            get_profile_by_name("non_existing_user")

    def test_get_profile_by_user_id(self):
        profile = get_profile_by_user_id(1)
        self.assertIsNotNone(profile)

        # first user is assumed to have default profile after migrations
        fm_user = get_freezeman_user(1)
        self.assertEqual(fm_user.profile.pk, profile.pk)

        with self.assertRaises(FreezemanUser.DoesNotExist):
            get_profile_by_user_id(9999)

    def test_update_preferences(self):
        DEFAULT_PROFILE = get_profile_by_name()
        DEFAULT_PREFERENCES = DEFAULT_PROFILE.preferences

        profile, errors, warnings = update_profile_preferences(1, DEFAULT_PREFERENCES)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertDictEqual(profile.preferences, DEFAULT_PREFERENCES)
        self.assertIsNone(profile.parent)
        self.assertEqual(profile.pk, DEFAULT_PROFILE.pk)

        new_preference = {"table.sample.page-limit": DEFAULT_PREFERENCES["table.sample.page-limit"] + 10}
        profile, errors, warnings = update_profile_preferences(1, new_preference)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertDictEqual(profile.preferences, new_preference)
        self.assertIsNotNone(profile.parent)
        self.assertEqual(profile.parent.pk, DEFAULT_PROFILE.pk)
        self.assertNotEqual(profile.pk, DEFAULT_PROFILE.pk)

        profile, errors, warnings = update_profile_preferences(1, DEFAULT_PREFERENCES)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertDictEqual(profile.preferences, {})
        self.assertIsNotNone(profile.parent)
        self.assertEqual(profile.parent.pk, DEFAULT_PROFILE.pk)
        self.assertNotEqual(profile.pk, DEFAULT_PROFILE.pk)
