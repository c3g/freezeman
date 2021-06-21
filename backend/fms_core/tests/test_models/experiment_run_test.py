from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import ExperimentRun, ExperimentType, Container, Instrument, Platform, InstrumentType
from fms_core.tests.constants import create_container

class ExperimentRunTest(TestCase):
    def setUp(self):
        self.experiment_workflow = "WorkflowTest"
        self.experiment_type, _ = ExperimentType.objects.get_or_create(workflow=self.experiment_workflow)
        self.container, _ = Container.objects.get_or_create(**create_container(barcode="Flowcell1212testtest"))
        instrument_platform, _ = Platform.objects.get_or_create(name="PlatformTest")
        instrument_type, _ = InstrumentType.objects.get_or_create(type="InstrumentTypeTest")
        self.instrument_name = "Instrument1"
        self.instrument, _ = Instrument.objects.get_or_create(platform=instrument_platform,
                                                              name=self.instrument_name,
                                                              type=instrument_type)


    def test_experiment_run(self):
        my_experiment_run = ExperimentRun.objects.create(experiment_type=self.experiment_type,
                                                         container=self.container,
                                                         instrument=self.instrument)
        self.assertEqual(my_experiment_run.experiment_type.workflow, self.experiment_workflow)                                               
        self.assertEqual(my_experiment_run.container.barcode, "Flowcell1212testtest")
        self.assertEqual(my_experiment_run.instrument.name, self.instrument_name)

    def test_missing_experiment_type(self):
         with self.assertRaises(ValidationError):
            try:
                er_without_et = ExperimentRun.objects.create(container=self.container,
                                                             instrument=self.instrument)
            except ValidationError as e:
                self.assertTrue("experiment_type" in e.message_dict)
                raise e
    
    def test_missing_container(self):
         with self.assertRaises(ValidationError):
            try:
                er_without_container = ExperimentRun.objects.create(experiment_type=self.experiment_type,
                                                                    instrument=self.instrument)
            except ValidationError as e:
                self.assertTrue("container" in e.message_dict)
                raise e

    def test_missing_container(self):
         with self.assertRaises(ValidationError):
            try:
                er_without_instrument = ExperimentRun.objects.create(container=self.container,
                                                                    experiment_type=self.experiment_type)
            except ValidationError as e:
                self.assertTrue("instrument" in e.message_dict)
                raise e
        