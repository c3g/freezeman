from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from fms_report.models import Report


class ReportTest(TestCase):
    def setUp(self):
        self.name = "production_report_test"
        self.display_name = "Production TEST"
        self.data_model = "ProductionData"

    def test_report(self):
        report = Report.objects.create(name=self.name, display_name=self.display_name, data_model=self.data_model)
        self.assertEqual(report.name, self.name)
        self.assertEqual(report.display_name, self.display_name)
        self.assertEqual(report.data_model, self.data_model)

    
    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                Report.objects.create(display_name=self.display_name, data_model=self.data_model)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e

    def test_duplicate(self):
        with self.assertRaises(ValidationError):
            try:
                Report.objects.create(name=self.name, display_name=self.display_name, data_model=self.data_model)
                Report.objects.create(name=self.name, display_name=self.display_name, data_model=self.data_model)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e