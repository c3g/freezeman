from django.test import TestCase
from django.utils import timezone

from fms_core.models import Readset
from fms_core.services.dataset import create_dataset
from fms_core.services.readset import create_readset
from fms_core.models._constants import ReleaseStatus, ValidationStatus

class ReadsetServicesTestCase(TestCase):

    def test_create_readset(self):
        dataset, _, _ = create_dataset(external_project_id="project", run_name="run", lane=1, project_name="MY_NAME_IS_PROJECT")
        readset, errors, warnings = create_readset(dataset=dataset,
                                                   name="SampleName_RunName",
                                                   sample_name="SampleName",
                                                   release_status=ReleaseStatus.AVAILABLE,
                                                   validation_status=ValidationStatus.PASSED)
       
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(Readset.objects.count(), 1)
        self.assertEqual(readset.dataset, dataset)
        self.assertEqual(readset.name, "SampleName_RunName")
        self.assertEqual(readset.sample_name, "SampleName")
        self.assertEqual(readset.release_status, ReleaseStatus.AVAILABLE)
        self.assertIsNone(readset.release_status_timestamp)
        self.assertEqual(readset.validation_status, ValidationStatus.PASSED)
        self.assertIsNotNone(readset.validation_status_timestamp)
        self.assertIsNone(readset.derived_sample)
        