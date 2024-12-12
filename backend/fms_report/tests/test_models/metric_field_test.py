from django.test import TestCase
from django.core.exceptions import ValidationError

from fms_report.models import MetricField, Report
from fms_report.models._constants import FieldDataType, AggregationType

class MetricFieldTest(TestCase):
    def setUp(self):
        self.report = Report.objects.create(name="TestReport", display_name="Test Report", data_model="ProductionData")
        self.name = "TestField"
        self.display_name = "Test Field"

    def test_metric_field(self):
        field = MetricField.objects.create(name=self.name,
                                           display_name=self.display_name,
                                           report=self.report,
                                           is_date=False,
                                           is_group=False,
                                           aggregation=AggregationType.COUNT,
                                           field_order=1,
                                           data_type=FieldDataType.STRING)
        
        self.assertEqual(field.name, self.name)
        self.assertEqual(field.display_name, self.display_name)
        self.assertEqual(field.report, self.report)
        self.assertFalse(field.is_date)
        self.assertFalse(field.is_group)
        self.assertEqual(field.aggregation, AggregationType.COUNT.value)
        self.assertEqual(field.field_order, 1)
        self.assertEqual(field.data_type, FieldDataType.STRING.value)    

    def test_duplicate_order(self):
        with self.assertRaises(ValidationError):
            try:
                MetricField.objects.create(name="field_1",
                                           display_name=self.display_name,
                                           report=self.report,
                                           is_date=False,
                                           is_group=False,
                                           aggregation=AggregationType.COUNT,
                                           field_order=1,
                                           data_type=FieldDataType.STRING)
                MetricField.objects.create(name="field_2",
                                           display_name=self.display_name,
                                           report=self.report,
                                           is_date=False,
                                           is_group=False,
                                           aggregation=AggregationType.COUNT,
                                           field_order=1,
                                           data_type=FieldDataType.STRING)
            except ValidationError as e:
                self.assertIn(f'Metric field with this Report and Field order already exists.', str(e))
                raise e
    
    def test_duplicate_name(self):
        with self.assertRaises(ValidationError):
            try:
                MetricField.objects.create(name="field_1",
                                           display_name=self.display_name,
                                           report=self.report,
                                           is_date=False,
                                           is_group=False,
                                           aggregation=AggregationType.COUNT,
                                           field_order=1,
                                           data_type=FieldDataType.STRING)
                MetricField.objects.create(name="field_1",
                                           display_name=self.display_name,
                                           report=self.report,
                                           is_date=False,
                                           is_group=False,
                                           aggregation=AggregationType.COUNT,
                                           field_order=2,
                                           data_type=FieldDataType.STRING)
            except ValidationError as e:
                self.assertIn(f'Metric field with this Report and Name already exists.', str(e))
                raise e
            
    def test_invalid_aggregation(self):
        with self.assertRaises(ValidationError):
            try:
                MetricField.objects.create(name="field_1",
                                           display_name=self.display_name,
                                           report=self.report,
                                           is_date=False,
                                           is_group=False,
                                           aggregation="TEST",
                                           field_order=1,
                                           data_type=FieldDataType.STRING)
            except ValidationError as e:
                self.assertTrue("aggregation" in e.message_dict)
                raise e

    def test_invalid_data_type(self):
        with self.assertRaises(ValidationError):
            try:
                MetricField.objects.create(name="field_1",
                                           display_name=self.display_name,
                                           report=self.report,
                                           is_date=False,
                                           is_group=False,
                                           aggregation=AggregationType.COUNT,
                                           field_order=1,
                                           data_type="TEST")
            except ValidationError as e:
                self.assertTrue("data_type" in e.message_dict)
                raise e