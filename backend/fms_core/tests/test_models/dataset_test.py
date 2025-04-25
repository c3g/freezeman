from django.test import TestCase
from django.core.exceptions import ValidationError

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
    Dataset
)
from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE

from fms_core.tests.constants import create_container

class DatasetTest(TestCase):
    """ Test module for Dataset model """

    def setUp(self) -> None:
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

        self.my_project = Project.objects.create(name="test", external_id="P031553")

        self.my_experiment_run = ExperimentRun.objects.create(name=self.experiment_name,
                                                              run_type=self.run_type,
                                                              container=self.container,
                                                              instrument=self.instrument,
                                                              process=self.process,
                                                              start_date=self.start_date)

    def test_dataset(self):
        dataset = Dataset.objects.create(project=self.my_project, experiment_run=self.my_experiment_run, lane=1)
        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.project.name, "test")
        self.assertEqual(dataset.project.external_id, "P031553")
        self.assertEqual(dataset.experiment_run.name, "test_run")
        self.assertEqual(dataset.lane, 1)

    def test_dataset_with_report(self):
        dataset = Dataset.objects.create(project=self.my_project, experiment_run=self.my_experiment_run, lane=1, metric_report_url="https://www.FakeMetricReport.com")
        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.project.name, "test")
        self.assertEqual(dataset.project.external_id, "P031553")
        self.assertEqual(dataset.experiment_run.name, "test_run")
        self.assertEqual(dataset.lane, 1)
        self.assertEqual(dataset.metric_report_url, "https://www.FakeMetricReport.com")

    def test_invalid_lane(self):
        invalid_lane = -1
        with self.subTest(msg=f"test_invalid_lane: {invalid_lane}"):
            try:
                Dataset.objects.create(project=self.my_project, experiment_run=self.my_experiment_run, lane=invalid_lane)
                self.fail("Invalid lane did not cause exception")
            except ValidationError as e:
                self.assertIn("Ensure this value is greater than or equal to 0.", e.messages)

    def test_duplicate_dataset(self):
        Dataset.objects.create(project=self.my_project, experiment_run=self.my_experiment_run, lane=1)

        valid_datasets = [
            dict(project=self.my_project, experiment_run=self.my_experiment_run, lane=1, metric_report_url="https://www.FakeMetricReport.com" ),
            dict(project=self.my_project, experiment_run=self.my_experiment_run, lane=1, metric_report_url="https://www.MoreFakeReports.com"),
        ]
        for vd in valid_datasets:
            with self.subTest(msg=f"test_duplicate_dataset: {vd}"):
                try:
                    Dataset.objects.create(**vd)
                except ValidationError as e:
                    self.assertIn(f"Dataset with this Project, Experiment run and Lane already exists.", e.messages)
                except Exception as e:
                    self.fail(f"Expected ValidationError exception but got '{repr(e)}'")
