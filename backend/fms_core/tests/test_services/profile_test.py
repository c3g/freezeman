from django.test import TestCase

from fms_core.models import Profile, FreezemanUser

# from fms_core.services.profile import update_user_profile

class ProfileServicesTestCase(TestCase):
    # def setUp(self) -> None:
    #     # ensure a default profile exists
    #     Profile.objects.get(name='Default')
    #     # ensure a FreezemanUser exists for user with id 1
    #     FreezemanUser.objects.get(user_id=1)

    # def test_update_user_profile(self):
    #     DEFAULT_PROFILE = Profile.objects.get(name="Default")
    #     DEFAULT_PREFERENCES = DEFAULT_PROFILE.preferences

    #     # no new profile is created if being initially set to default preferences
    #     still_default_profile, errors, warnings = update_user_profile(user_id=1, preferences=DEFAULT_PREFERENCES)
    #     self.assertEqual(errors, [])
    #     self.assertEqual(warnings, [])
    #     self.assertDictEqual(still_default_profile.preferences, DEFAULT_PREFERENCES)
    #     self.assertIsNone(still_default_profile.parent)
    #     self.assertEqual(still_default_profile.pk, DEFAULT_PROFILE.pk)

    #     # new profile is created with new preferences
    #     new_preference = {"table.sample.page-limit": DEFAULT_PREFERENCES["table.sample.page-limit"] + 10}
    #     new_profile, errors, warnings = update_user_profile(user_id=1, preferences=new_preference)
    #     self.assertEqual(errors, [])
    #     self.assertEqual(warnings, [])
    #     self.assertDictEqual(new_profile.preferences, new_preference)
    #     self.assertIsNotNone(new_profile.parent)
    #     self.assertEqual(new_profile.parent.pk, DEFAULT_PROFILE.pk)
    #     self.assertNotEqual(new_profile.pk, DEFAULT_PROFILE.pk)

    #     # if new preferences are the same as default, the new profile is updated to have empty preferences
    #     same_new_profile, errors, warnings = update_user_profile(user_id=1, preferences=DEFAULT_PREFERENCES)
    #     self.assertEqual(errors, [])
    #     self.assertEqual(warnings, [])
    #     self.assertDictEqual(same_new_profile.preferences, {})
    #     self.assertIsNotNone(same_new_profile.parent)
    #     self.assertEqual(same_new_profile.parent.pk, DEFAULT_PROFILE.pk)
    #     self.assertEqual(same_new_profile.pk, new_profile.pk)
