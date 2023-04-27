from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Dataset, Readset, DatasetFile, SampleRunMetric, Metric

class MetricTest(TestCase):
    def setUp(self):
        self.dataset = Dataset.objects.create(external_project_id="project", run_name="run", lane="1")
        self.readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset)
        self.dataset_file = DatasetFile.objects.create(readset=self.readset, file_path="file_path")
        self.sample_run_metric = SampleRunMetric.objects.create(readset=self.readset)

    def test_metric_numeric(self):
        metric = Metric.objects.create(name="Reads", sample_run_metric=self.sample_run_metric, metric_group="qc", value_numeric=10030302)

        self.assertEqual(metric.name, "Reads")
        self.assertEqual(metric.sample_run_metric, self.sample_run_metric)
        self.assertEqual(metric.metric_group, "qc")
        self.assertEqual(metric.value_numeric, 10030302)
        self.assertIsNone(metric.value_string)

    def test_metric_string(self):
        metric = Metric.objects.create(name="Top Hits : 1st",
                                       sample_run_metric=self.sample_run_metric,
                                       metric_group="blast",
                                       value_string="Hippopodonculus Rex")

        self.assertEqual(metric.name, "Top Hits : 1st")
        self.assertEqual(metric.sample_run_metric, self.sample_run_metric)
        self.assertEqual(metric.metric_group, "blast")
        self.assertEqual(metric.value_string, "Hippopodonculus Rex")
        self.assertIsNone(metric.value_numeric)

    def test_metric_string(self):
        with self.assertRaises(ValidationError):
            try:
                metric = Metric.objects.create(name="ErroneousMetricus",
                                               sample_run_metric=self.sample_run_metric,
                                               metric_group="blarg",
                                               value_numeric=707,
                                               value_string="NoTaNuMbEr")
            except ValidationError as err:
                self.assertTrue('value' in err.message_dict)
                raise err