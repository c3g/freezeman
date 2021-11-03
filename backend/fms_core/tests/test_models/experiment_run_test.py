from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (
    ExperimentRun,
    RunType,
    Container,
    Instrument,
    Platform,
    InstrumentType,
    Process,
    Protocol,
)
from fms_core.tests.constants import create_container
from datetime import datetime

class ExperimentRunTest(TestCase):
    def setUp(self):
        self.start_date = "2021-06-22"
        self.run_type_name = "Infinium Global Screening Array-24"
        self.run_type, _ = RunType.objects.get_or_create(name=self.run_type_name)

        self.container, _ = Container.objects.get_or_create(**create_container(name="Flowcell1212testtest", barcode="Flowcell1212testtest", kind="infinium gs 24 beadchip"))
        self.container_invalid_kind, _ = Container.objects.get_or_create(**create_container(name="NotABeadchip", barcode="NotABeadchip", kind="96-well plate"))

        platform, _ = Platform.objects.get_or_create(name="PlatformTest")
        instrument_type, _ = InstrumentType.objects.get_or_create(type="InstrumentTypeTest", platform=platform)
        self.instrument_name = "Instrument1"
        self.instrument, _ = Instrument.objects.get_or_create(name=self.instrument_name,
                                                              type=instrument_type)

        self.protocol_name = "MyProtocolTest"
        self.protocol, _ = Protocol.objects.get_or_create(name=self.protocol_name)
        self.process = Process.objects.create(protocol=self.protocol, comment="Process test for ExperimentRun")

    def test_experiment_run(self):
        my_experiment_run = ExperimentRun.objects.create(run_type=self.run_type,
                                                         container=self.container,
                                                         instrument=self.instrument,
                                                         process=self.process,
                                                         start_date=self.start_date)
        self.assertEqual(my_experiment_run.run_type.name, self.run_type_name)                                               
        self.assertEqual(my_experiment_run.container.barcode, "Flowcell1212testtest")
        self.assertEqual(my_experiment_run.instrument.name, self.instrument_name)
        self.assertEqual(my_experiment_run.start_date, datetime.strptime(self.start_date, "%Y-%m-%d").date())

    def test_missing_run_type(self):
        with self.assertRaises(ValidationError):
            try:
                er_without_rt = ExperimentRun.objects.create(container=self.container,
                                                             instrument=self.instrument,
                                                             process=self.process,
                                                             start_date=self.start_date)
            except ValidationError as e:
                self.assertTrue("run_type" in e.message_dict)
                raise e
    
    def test_missing_container(self):
        with self.assertRaises(ValidationError):
            try:
                er_without_container = ExperimentRun.objects.create(run_type=self.run_type,
                                                                    instrument=self.instrument,
                                                                    process=self.process,
                                                                    start_date=self.start_date)
            except ValidationError as e:
                self.assertTrue("container" in e.message_dict)
                raise e

    def test_container_invalid_kind(self):
        with self.assertRaises(ValidationError):
            try:
                er_invalid_container_kind = ExperimentRun.objects.create(run_type=self.run_type,
                                                                         container=self.container_invalid_kind,
                                                                         instrument=self.instrument,
                                                                         process=self.process,
                                                                         start_date=self.start_date)
            except ValidationError as e:
                self.assertTrue("container" in e.message_dict)
                raise e

    def test_duplicate_experiment_run_with_container(self):
        with self.assertRaises(ValidationError):
            # First ExperimentRun is valid
            ExperimentRun.objects.create(run_type=self.run_type,
                                         container=self.container,
                                         instrument=self.instrument,
                                         process=self.process,
                                         start_date=self.start_date)

            try:
                process_2 = Process.objects.create(protocol=self.protocol, comment="Process test 2")
                # Second ExperimentRun has the same Container, should be invalid
                ExperimentRun.objects.create(run_type=self.run_type,
                                             container=self.container,
                                             instrument=self.instrument,
                                             process=process_2,
                                             start_date=self.start_date)
            except ValidationError as e:
                self.assertTrue("container" in e.message_dict)
                raise e

    def test_missing_instrument(self):
        with self.assertRaises(ValidationError):
            try:
                er_without_instrument = ExperimentRun.objects.create(container=self.container,
                                                                     run_type=self.run_type,
                                                                     process=self.process,
                                                                     start_date=self.start_date)
            except ValidationError as e:
                self.assertTrue("instrument" in e.message_dict)
                raise e

    def test_missing_process(self):
        with self.assertRaises(ValidationError):
            try:
                ExperimentRun.objects.create(run_type=self.run_type,
                                             container=self.container,
                                             instrument=self.instrument,
                                             start_date=self.start_date)
            except ValidationError as e:
                self.assertTrue("process" in e.message_dict)
                raise e

    def test_missing_date(self):
        with self.assertRaises(ValidationError):
            try:
                er_without_date = ExperimentRun.objects.create(container=self.container,
                                                               instrument=self.instrument,
                                                               process=self.process,
                                                               run_type=self.run_type)
            except ValidationError as e:
                self.assertTrue("start_date" in e.message_dict)
                raise e