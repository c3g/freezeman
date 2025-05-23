from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User

from fms_core.models._constants import ValidationStatus, ReleaseStatus
from fms_core.tests.constants import create_sample, create_sample_container, create_container

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
    Readset,
    Sample
)
from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE

class ReadsetTest(TestCase):
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
        self.currentuser = User.objects.get(username="biobankadmin")

    def test_readset(self):
        readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset)
        self.assertEqual(readset.name, "My_Readset")
        self.assertEqual(readset.sample_name, "My")
        self.assertEqual(readset.dataset, self.dataset)

    def test_readset_with_derived_sample(self):
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01', barcode='T123456'))
        sample = Sample.objects.create(**create_sample(container=self.valid_container, comment="This is a sample."))
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=self.dataset,
                                         derived_sample=sample.derived_sample_not_pool)
        self.assertEqual(readset.name, "My_Readset")
        self.assertEqual(readset.sample_name, "My")
        self.assertEqual(readset.dataset, self.dataset)
        self.assertEqual(readset.derived_sample, sample.derived_sample_not_pool)

    def test_readset_with_validation_timestamp(self):
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=self.dataset,
                                         validation_status=ValidationStatus.PASSED,
                                         validation_status_timestamp=timezone.now(),
                                         validated_by=self.currentuser)
        self.assertEqual(readset.name, "My_Readset")
        self.assertEqual(readset.sample_name, "My")
        self.assertEqual(readset.dataset, self.dataset)
        self.assertIsNotNone(readset.validation_status_timestamp)
        self.assertEqual(readset.validated_by, self.currentuser)

    def test_readset_with_released_timestamp(self):
        readset = Readset.objects.create(name="My_Readset",
                                         sample_name="My",
                                         dataset=self.dataset,
                                         release_status=ReleaseStatus.RELEASED,
                                         release_status_timestamp=timezone.now(),
                                         released_by=self.currentuser)
        self.assertEqual(readset.name, "My_Readset")
        self.assertEqual(readset.sample_name, "My")
        self.assertEqual(readset.dataset, self.dataset)
        self.assertIsNotNone(readset.release_status_timestamp)
        self.assertEqual(readset.released_by, self.currentuser)

    def test_readset_without_validation_timestamp(self):
        with self.assertRaises(ValidationError):
            try:
                Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset, validation_status=ValidationStatus.PASSED)
            except ValidationError as e:
                self.assertTrue('validation_status_timestamp' in e.message_dict)
                raise e
    
    def test_readset_without_release_timestamp(self):
        with self.assertRaises(ValidationError):
            try:
                Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset, release_status=ReleaseStatus.RELEASED)
            except ValidationError as e:
                self.assertTrue('release_status_timestamp' in e.message_dict)
                raise e
    
    def test_readset_without_validated_by(self):
        with self.assertRaises(ValidationError):
            try:
                Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset, validation_status=ValidationStatus.FAILED, validation_status_timestamp=timezone.now())
            except ValidationError as e:
                self.assertTrue('validated_by' in e.message_dict)
                raise e

    def test_readset_without_released_by(self):
        with self.assertRaises(ValidationError):
            try:
                Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset, release_status=ReleaseStatus.BLOCKED, release_status_timestamp=timezone.now())
            except ValidationError as e:
                self.assertTrue('released_by' in e.message_dict)
                raise e