from django.test import TestCase

from fms_core.models import Profile, FreezemanUser

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

        # no new profile is created if being initially set to default preferences
        still_default_profile, errors, warnings = update_profile_preferences(1, DEFAULT_PREFERENCES)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertDictEqual(still_default_profile.preferences, DEFAULT_PREFERENCES)
        self.assertIsNone(still_default_profile.parent)
        self.assertEqual(still_default_profile.pk, DEFAULT_PROFILE.pk)

        # new profile is created with new preferences
        new_preference = {"table.sample.page-limit": DEFAULT_PREFERENCES["table.sample.page-limit"] + 10}
        new_profile, errors, warnings = update_profile_preferences(1, new_preference)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertDictEqual(new_profile.preferences, new_preference)
        self.assertIsNotNone(new_profile.parent)
        self.assertEqual(new_profile.parent.pk, DEFAULT_PROFILE.pk)
        self.assertNotEqual(new_profile.pk, DEFAULT_PROFILE.pk)

        # if new preferences are the same as default, the new profile is updated to have empty preferences
        same_new_profile, errors, warnings = update_profile_preferences(1, DEFAULT_PREFERENCES)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertDictEqual(same_new_profile.preferences, {})
        self.assertIsNotNone(same_new_profile.parent)
        self.assertEqual(same_new_profile.parent.pk, DEFAULT_PROFILE.pk)
        self.assertEqual(same_new_profile.pk, new_profile.pk)
