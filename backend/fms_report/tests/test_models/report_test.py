from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from fms_report.models import Report


class ReportTest(TestCase):
    def setUp(self):
        self.name = "production_report_test"
        self.display_name = "Production TEST"
        self.data_model = "production_data"

    def test_report(self):
        report = Report.objects.create(name=self.name, display_name=self.display_name, data_model=self.data_model)
        self.assertEqual(report.name, self.name)
        self.assertEqual(report.display_name, self.display_name)
        self.assertEqual(report.data_model, self.data_model)

    
    def test_missing_name(self):
        with self.assertRaises(IntegrityError):
            try:
                Report.objects.create(display_name=self.display_name, data_model=self.data_model)
            except IntegrityError as e:
                self.assertIn('null value in column "name" violates not-null constraint', str(e))
                raise e

    def test_duplicate(self):
        with self.assertRaises(IntegrityError):
            try:
                Report.objects.create(name=self.name, display_name=self.display_name, data_model=self.data_model)
                Report.objects.create(name=self.name, display_name=self.display_name, data_model=self.data_model)
            except IntegrityError as e:
                self.assertIn('Key (name)=(production_report_test) already exists.', str(e))
                raise e