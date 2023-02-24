import datetime

from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import StepHistory, Protocol, Step, StepOrder,Workflow, Project, Study, Container, Sample, Process, ProcessMeasurement
from fms_core.tests.constants import create_sample, create_sample_container

class StepHistoryTest(TestCase):
    def setUp(self):
        protocol1 = Protocol.objects.get(name="Extraction")
        self.step1, _ = Step.objects.get_or_create(name="Extraction (test)", protocol=protocol1)
        self.order = 1
        self.workflow = Workflow.objects.create(name="Test Workflow",
                                                structure="Test")
        self.step_order_1 = StepOrder.objects.create(step=self.step1,
                                                     next_step_order=None,
                                                     workflow=self.workflow,
                                                     order=self.order)
        self.letter_valid = "A"
        self.project, _ = Project.objects.get_or_create(name="TestStudy")
        self.start = 1
        self.end = 1
        self.study = Study.objects.create(letter=self.letter_valid,
                                          project=self.project,
                                          workflow=self.workflow,
                                          start=self.start,
                                          end=self.end)

        self.tube_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube04', barcode='TParent01'))
        self.source_sample = Sample.objects.create(**create_sample(container=self.tube_container, name="test_source_sample"))
        self.extraction_protocol, _ = Protocol.objects.get_or_create(name="Extraction")
        self.transfer_protocol, _ = Protocol.objects.get_or_create(name="Transfer")
        self.update_protocol, _ = Protocol.objects.get_or_create(name="Update")
        self.process = Process.objects.create(protocol=self.update_protocol, comment="Process for Protocol Update Test")


        self.process_measurement = ProcessMeasurement.objects.create(process=self.process,
                                                                     source_sample=self.source_sample,
                                                                     volume_used=None,
                                                                     comment="Test comment",
                                                                     execution_date=datetime.datetime.today())
    def test_step_history(self):
        step_history = StepHistory.objects.create(study=self.study,
                                                  step_order=self.step_order_1,
                                                  process_measurement=self.process_measurement)
        self.assertIsNotNone(step_history)
        self.assertEqual(step_history.step_order.step.name, "Extraction (test)")
        self.assertEqual(step_history.study.letter, "A")
        self.assertEqual(step_history.process_measurement.source_sample, self.source_sample)

    def test_step_history_duplicate(self):
        step_history = StepHistory.objects.create(study=self.study,
                                                  step_order=self.step_order_1,
                                                  process_measurement=self.process_measurement)
        with self.assertRaises(ValidationError):
            try:
                step_history_duplicate = StepHistory.objects.create(study=self.study,
                                                                    step_order=self.step_order_1,
                                                                    process_measurement=self.process_measurement)
            except ValidationError as err:
                self.assertEqual(err.message_dict["__all__"], ["Step history with this Study, Step order and Process measurement already exists."])
                raise err
