from django.test import TestCase
from django.db import IntegrityError
from django.core.exceptions import ValidationError

from django.utils import timezone

from fms_report.models import ProductionTracking
from fms_core.models import Readset, Dataset
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

class ProductionTrackingTest(TestCase):
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

        self.project = Project.objects.create(name="MY_NAME_IS_PROJECT", external_id="P031553")

        self.experiment_run = ExperimentRun.objects.create(name=self.experiment_name,
                                                           run_type=self.run_type,
                                                           container=self.container,
                                                           instrument=self.instrument,
                                                           process=self.process,
                                                           start_date=self.start_date)

        self.dataset = Dataset.objects.create(project=self.project, experiment_run=self.experiment_run, lane=1)
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
        with self.assertRaises(ValidationError):
            try:
                ProductionTracking.objects.create(extracted_readset=self.readset, validation_timestamp=self.timestamp)
                ProductionTracking.objects.create(extracted_readset=self.readset, validation_timestamp=self.timestamp)
            except ValidationError as e:
                self.assertTrue("extracted_readset" in e.message_dict)
                raise e