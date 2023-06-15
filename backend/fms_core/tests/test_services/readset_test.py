from django.test import TestCase

from fms_core.models import Readset
from fms_core.services.dataset import create_dataset
from fms_core.services.readset import create_readset

class ReadsetServicesTestCase(TestCase):

    def test_create_readset(self):
        dataset, _, _ = create_dataset(external_project_id="project", run_name="run", lane=1)
        readset, errors, warnings = create_readset(dataset=dataset, name="SampleName_RunName", sample_name="SampleName")
       
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(Readset.objects.count(), 1)
        self.assertEqual(readset.dataset, dataset)
        self.assertEqual(readset.name, "SampleName_RunName")
        self.assertEqual(readset.sample_name, "SampleName")
        self.assertIsNone(readset.derived_sample)
        