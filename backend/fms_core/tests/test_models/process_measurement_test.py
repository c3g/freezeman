from django.core.exceptions import ValidationError
from django.test import TestCase

import datetime

from fms_core.models import Container, Sample, Process, ProcessMeasurement, Protocol

from fms_core.tests.constants import create_sample, create_sample_container


class ProcessMeasurementTest(TestCase):
    def setUp(self):
        self.tube_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube04', barcode='TParent01'))
        self.source_sample = Sample.objects.create(**create_sample(container=self.tube_container, name="test_source_sample"))
        self.extraction_protocol, _ = Protocol.objects.get_or_create(name="Extraction")
        self.transfer_protocol, _ = Protocol.objects.get_or_create(name="Transfer")
        self.update_protocol, _ = Protocol.objects.get_or_create(name="Update")
        self.process = Process.objects.create(protocol=self.update_protocol, comment="Process for Protocol Update Test")


    def test_process_measurement(self):
        pm = ProcessMeasurement.objects.create(process=self.process,
                                               source_sample=self.source_sample,
                                               volume_used=None,
                                               comment="Test comment",
                                               execution_date=datetime.datetime.today())
        self.assertEqual(pm.volume_used, None)
        self.assertEqual(pm.comment, "Test comment")
        self.assertEqual(pm.process.id, self.process.id)
        self.assertEqual(pm.process.protocol.name, self.process.protocol.name)
        self.assertEqual(pm.source_sample, self.source_sample)


    def test_missing_process(self):
        with self.assertRaises(Process.DoesNotExist):
            ProcessMeasurement.objects.create(source_sample=self.source_sample,
                                              volume_used=None,
                                              comment="Test comment")

    def test_missing_source_sample(self):
        with self.assertRaises(ValidationError):
            try:
                ProcessMeasurement.objects.create(process=self.process,
                                                  volume_used=None,
                                                  comment="Test comment")
            except ValidationError as e:
                self.assertTrue('source_sample' in e.message_dict)
                raise e

    def test_missing_volume_used_in_extraction(self):
        process = Process.objects.create(protocol=self.extraction_protocol,
                                         comment="Process for Protocol Extraction Test")
        with self.assertRaises(ValidationError):
            try:
                ProcessMeasurement.objects.create(process=process,
                                                  source_sample=self.source_sample,
                                                  comment="Test comment")
            except ValidationError as e:
                self.assertTrue('volume_used' in e.message_dict)
                raise e

    def test_missing_volume_used_in_transfer(self):
        process = Process.objects.create(protocol=self.transfer_protocol,
                                         comment="Process for Protocol Transfer Test")
        with self.assertRaises(ValidationError):
            try:
                ProcessMeasurement.objects.create(process=process,
                                                  source_sample=self.source_sample,
                                                  comment="Test comment")
            except ValidationError as e:
                self.assertTrue('volume_used' in e.message_dict)
                raise e