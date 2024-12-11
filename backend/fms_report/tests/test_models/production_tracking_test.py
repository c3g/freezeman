from django.test import TestCase
from django.db import IntegrityError

from django.utils import timezone

from fms_report.models import ProductionTracking
from fms_core.models import Readset, Dataset

class ProductionTrackingTest(TestCase):
    def setUp(self):
        self.dataset = Dataset.objects.create(external_project_id="P000001", run_name="run", lane=1, project_name="test")
        self.readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset)
        self.timestamp = timezone.now()

    def test_production_tracking(self):
        production_tracking = ProductionTracking.objects.create(extracted_readset=self.readset, validation_timestamp=self.timestamp)
        self.assertEqual(production_tracking.extracted_readset, self.readset)
        self.assertEqual(production_tracking.validation_timestamp, self.timestamp)

    def test_empty_timestamp(self):
        production_tracking = ProductionTracking.objects.create(extracted_readset=self.readset)
        self.assertEqual(production_tracking.extracted_readset, self.readset)
        self.assertIsNone(production_tracking.validation_timestamp)

    def test_duplicate(self):
        with self.assertRaises(IntegrityError):
            try:
                ProductionTracking.objects.create(extracted_readset=self.readset, validation_timestamp=self.timestamp)
                ProductionTracking.objects.create(extracted_readset=self.readset, validation_timestamp=self.timestamp)
            except IntegrityError as e:
                self.assertIn('Key (extracted_readset_id)=(1) already exists.', str(e))
                raise e