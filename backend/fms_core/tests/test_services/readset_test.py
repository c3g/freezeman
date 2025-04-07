from django.test import TestCase

from fms_core.models import Readset
from fms_core.services.dataset import create_dataset
from fms_core.services.readset import create_readset
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
    Readset
)
from fms_core.tests.constants import create_container

class ReadsetServicesTestCase(TestCase):
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

        self.project = Project.objects.create(name="MY_NAME_IS_PROJECT", external_id="P031553")

        self.experiment_run = ExperimentRun.objects.create(name=self.experiment_name,
                                                           run_type=self.run_type,
                                                           container=self.container,
                                                           instrument=self.instrument,
                                                           process=self.process,
                                                           start_date=self.start_date)

    def test_create_readset(self):
        dataset, _, _ = create_dataset(project_id=self.project.id, experiment_run_id=self.experiment_run.id, lane=1)
        readset, errors, warnings = create_readset(dataset=dataset,
                                                   name="SampleName_RunName",
                                                   sample_name="SampleName",
                                                   release_status=ReleaseStatus.AVAILABLE,
                                                   validation_status=ValidationStatus.PASSED)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(Readset.objects.count(), 1)
        self.assertEqual(readset.dataset, dataset)
        self.assertEqual(readset.name, "SampleName_RunName")
        self.assertEqual(readset.sample_name, "SampleName")
        self.assertEqual(readset.release_status, ReleaseStatus.AVAILABLE)
        self.assertIsNone(readset.release_status_timestamp)
        self.assertEqual(readset.validation_status, ValidationStatus.PASSED)
        self.assertIsNotNone(readset.validation_status_timestamp)
        self.assertIsNone(readset.derived_sample)
        self.assertEqual(readset.validated_by.username, "biobankadmin")
        