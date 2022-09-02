from django.test import TestCase

from fms_core.services.platform import get_platform


class PlatformServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        self.valid_platform_name = "DNBSEQ"
        self.invalid_platform_name = "MADE_UP_ILLUMINA"

    def test_get_platform(self):
        """
          Test assumes there's a platform [DNBSEQ] already created
        """
        platform, errors, warnings = get_platform(self.valid_platform_name)

        self.assertEqual(platform.name, self.valid_platform_name)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_get_invalid_platform(self):
        """
          Test assumes there's not an instrument named [MADE_UP_ILLUMINA]
        """
        platform, errors, warnings = get_platform(self.invalid_platform_name)

        self.assertEqual(platform, None)
        self.assertEqual(errors, [f"No platform named {self.invalid_platform_name} could be found."])
        self.assertEqual(warnings, [])
