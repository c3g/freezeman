from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (
    RunType,
    Container,
    Instrument,
    Platform,
    InstrumentType,
    Process,
    Protocol,
    ExperimentRun,
    Project,
    Dataset,
    DatasetFile,
    Readset,
    Metric
)
from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE

from fms_core.tests.constants import create_container

class MetricTest(TestCase):
    def setUp(self):
        self.start_date = "2025-04-07"
        self.experiment_name = "test_run"
        self.run_type_name = "Illumina"
        self.run_type, _ = RunType.objects.get_or_create(name=self.run_type_name)

        self.container, _ = Container.objects.get_or_create(**create_container(name="Flowcell1212testtest", barcode="Flowcell1212testtest", kind="illumina-novaseq-s4 flowcell"))
        self.container_invalid_kind, _ = Container.objects.get_or_create(**create_container(name="NotAFlowcell", barcode="NotAFlowcell", kind="96-well plate"))

        platform, _ = Platform.objects.get_or_create(name="PlatformTest")
        instrument_type, _ = InstrumentType.objects.get_or_create(type="InstrumentTypeTest",
                                                                  platform=platform,
                                                                  index_read_5_prime=INDEX_READ_FORWARD,
                                                                  index_read_3_prime=INDEX_READ_REVERSE)
        self.instrument_name = "Instrument1"
        self.instrument, _ = Instrument.objects.get_or_create(name=self.instrument_name,
                                                              type=instrument_type,
                                                              serial_id="Test101")

        self.protocol_name = "MyProtocolTest"
        self.protocol, _ = Protocol.objects.get_or_create(name=self.protocol_name)
        self.process = Process.objects.create(protocol=self.protocol, comment="Process test for ExperimentRun")

        self.project = Project.objects.create(name="test", external_id="P031553")

        self.experiment_run = ExperimentRun.objects.create(name=self.experiment_name,
                                                           run_type=self.run_type,
                                                           container=self.container,
                                                           instrument=self.instrument,
                                                           process=self.process,
                                                           start_date=self.start_date)


        self.dataset = Dataset.objects.create(project=self.project, experiment_run=self.experiment_run, lane="1")
        self.readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset)
        self.dataset_file = DatasetFile.objects.create(readset=self.readset, file_path="file_path", size=1)

    def test_metric_numeric(self):
        metric = Metric.objects.create(name="Reads", readset=self.readset, metric_group="qc", value_numeric=10030302)

        self.assertEqual(metric.name, "Reads")
        self.assertEqual(metric.readset, self.readset)
        self.assertEqual(metric.metric_group, "qc")
        self.assertEqual(metric.value_numeric, 10030302)
        self.assertIsNone(metric.value_string)

    def test_metric_string(self):
        metric = Metric.objects.create(name="Top Hits : 1st",
                                       readset=self.readset,
                                       metric_group="blast",
                                       value_string="Hippopodonculus Rex")

        self.assertEqual(metric.name, "Top Hits : 1st")
        self.assertEqual(metric.readset, self.readset)
        self.assertEqual(metric.metric_group, "blast")
        self.assertEqual(metric.value_string, "Hippopodonculus Rex")
        self.assertIsNone(metric.value_numeric)

    def test_metric_string(self):
        with self.assertRaises(ValidationError):
            try:
                metric = Metric.objects.create(name="ErroneousMetricus",
                                               readset=self.readset,
                                               metric_group="blarg",
                                               value_numeric=707,
                                               value_string="NoTaNuMbEr")
            except ValidationError as err:
                self.assertTrue('value' in err.message_dict)
                raise err