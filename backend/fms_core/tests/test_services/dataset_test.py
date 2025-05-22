from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User

from fms_core.services.dataset import (create_dataset,
                                       create_dataset_file,
                                       reset_dataset_content,
                                       set_experiment_run_lane_validation_status,
                                       get_experiment_run_lane_validation_status)
from fms_core.models._constants import ReleaseStatus, ValidationStatus, INDEX_READ_FORWARD, INDEX_READ_REVERSE
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
from fms_core.tests.constants import create_container

class DatasetServicesTestCase(TestCase):
    def setUp(self) -> None:
        self.METRIC_REPORT_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        self.currentuser = User.objects.get(username="biobankadmin")

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

        self.project = Project.objects.create(name="MY_NAME_IS_PROJECT", external_id="P031553")

        self.experiment_run = ExperimentRun.objects.create(name=self.experiment_name,
                                                           run_type=self.run_type,
                                                           container=self.container,
                                                           instrument=self.instrument,
                                                           process=self.process,
                                                           start_date=self.start_date)

    def test_create_dataset(self):
        dataset, errors, warnings = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1, metric_report_url=self.METRIC_REPORT_URL)
        self.assertFalse(errors, "errors occured while creating a valid dataset with create_dataset")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.project.external_id, "P031553")
        self.assertEqual(dataset.experiment_run.name, "test_run")
        self.assertEqual(dataset.lane, 1)
        self.assertEqual(dataset.metric_report_url, self.METRIC_REPORT_URL)
        self.assertEqual(dataset.project.name, self.project.name)
    
    def test_create_dataset_without_metric_report(self):
        dataset, errors, warnings = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1)
        self.assertFalse(errors, "errors occured while creating a valid dataset with create_dataset")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(dataset.project.external_id, "P031553")
        self.assertEqual(dataset.experiment_run.name, "test_run")
        self.assertEqual(dataset.lane, 1)
        self.assertEqual(dataset.project.name, self.project.name)
        self.assertIsNone(dataset.metric_report_url)

    def test_create_dataset_without_replace(self):
        dataset, errors, warnings = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1)
        _, errors, _ = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1)
        self.assertTrue(errors)
    
    def test_create_dataset_with_replace(self):
        dataset, errors, warnings = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1)
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, errors, warnings = create_dataset_file(readset, file_path="file_path", size=3)

        dataset, errors, warnings = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1, metric_report_url=self.METRIC_REPORT_URL, replace=True)
        self.assertIsNotNone(dataset)
        self.assertCountEqual(errors, [])
        if dataset:
            self.assertCountEqual(Readset.objects.filter(dataset=dataset.id), [])
            self.assertCountEqual(DatasetFile.objects.filter(readset=readset.id), [])
            self.assertEqual(dataset.metric_report_url, self.METRIC_REPORT_URL)

    def test_reset_dataset_content(self):
        dataset, _, _ = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1, metric_report_url=self.METRIC_REPORT_URL)
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=dataset,
                                         release_status=ReleaseStatus.BLOCKED,
                                         release_status_timestamp=timezone.now(),
                                         released_by=self.currentuser)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", size=3)
        metric = Metric.objects.create(readset=readset, name="Reads", metric_group="RunQC", value_numeric=1000)

        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(Readset.objects.count(), 1)
        self.assertEqual(Metric.objects.count(), 1)

        errors, warnings = reset_dataset_content(dataset)
        
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(Dataset.objects.count(), 1)
        self.assertEqual(DatasetFile.objects.count(), 0)
        self.assertEqual(Readset.objects.count(), 0)
        self.assertEqual(Metric.objects.count(), 0)
        

    def test_create_dataset_file(self):
        dataset, errors, warnings = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1)
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=dataset,
                                         release_status=ReleaseStatus.BLOCKED,
                                         release_status_timestamp=timezone.now(),
                                         released_by=self.currentuser)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", size=3)

        self.assertCountEqual(errors, [])
        self.assertCountEqual(warnings, [])
        self.assertIsNotNone(dataset_file)

        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(dataset_file.readset, readset)
        self.assertEqual(dataset_file.file_path, "file_path")
        self.assertEqual(dataset_file.readset.validation_status, ValidationStatus.AVAILABLE)
        self.assertIsNone(dataset_file.readset.validation_status_timestamp)

    def test_create_dataset_file_with_validation_status_passed(self):
        dataset, errors, warnings = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1)
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=dataset,
                                         validation_status=ValidationStatus.PASSED,
                                         validation_status_timestamp=timezone.now(),
                                         validated_by=self.currentuser)
        dataset_file, errors, warnings = create_dataset_file(readset=readset, file_path="file_path", size=3)

        self.assertFalse(errors, "errors occured while creating a valid dataset file with create_dataset_file")
        self.assertFalse(warnings, "warnings is expected to be empty")
        self.assertIsNotNone(dataset_file)
        self.assertEqual(dataset_file.readset.release_status, ReleaseStatus.AVAILABLE)
        self.assertIsNone(dataset_file.readset.release_status_timestamp)
        self.assertIsNone(dataset_file.readset.released_by)
        self.assertEqual(dataset_file.readset.validation_status, ValidationStatus.PASSED)
        self.assertIsNotNone(dataset_file.readset.validation_status_timestamp)
        self.assertEqual(dataset_file.readset.validated_by, self.currentuser)

    def test_set_experiment_run_lane_validation_status(self):
        dataset, _, _ = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1)
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, _, _ = create_dataset_file(readset=readset, file_path="file_path", size=3)

        count, errors, warnings = set_experiment_run_lane_validation_status(experiment_run_id=self.experiment_run.id, lane=dataset.lane, validation_status=ValidationStatus.FAILED, validated_by=self.currentuser)

        dataset_file.refresh_from_db()

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(count, 1)
        self.assertEqual(dataset_file.readset.validation_status, ValidationStatus.FAILED)
        self.assertIsNotNone(dataset_file.readset.validation_status_timestamp)
        self.assertEqual(dataset_file.readset.validated_by, self.currentuser)

    def test_get_experiment_run_lane_validation_status(self):
        dataset, _, _ = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1)
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=dataset)
        dataset_file, _, _ = create_dataset_file(readset=readset, file_path="file_path", size=3)

        validation_status, errors, warnings = get_experiment_run_lane_validation_status(experiment_run_id=self.experiment_run.id, lane=dataset.lane)

        dataset_file.refresh_from_db()

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(validation_status, ValidationStatus.AVAILABLE)
        self.assertEqual(dataset_file.readset.validation_status, ValidationStatus.AVAILABLE)
        self.assertIsNone(dataset_file.readset.validation_status_timestamp)

        count, errors, warnings = set_experiment_run_lane_validation_status(experiment_run_id=self.experiment_run.id, lane=dataset.lane, validation_status=ValidationStatus.FAILED, validated_by=self.currentuser)

        validation_status, errors, warnings = get_experiment_run_lane_validation_status(experiment_run_id=self.experiment_run.id, lane=dataset.lane)

        dataset_file.refresh_from_db()

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(validation_status, ValidationStatus.FAILED)
        self.assertEqual(dataset_file.readset.validation_status, ValidationStatus.FAILED)
        self.assertIsNotNone(dataset_file.readset.validation_status_timestamp)
        self.assertEqual(dataset_file.readset.validated_by, self.currentuser)