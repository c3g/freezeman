from django.core.exceptions import ValidationError
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from fms_core.models import (
    Container,
    Sample,
    Individual,
    Process,
    ProcessMeasurement,
    Protocol,
    SampleKind,
    SampleLineage)

from fms_core.tests.constants import create_container, create_individual, create_fullsample, create_sample_container


class SampleLineageTest(TestCase):

    def setUp(self):
        self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD")
        self.sample_kind_DNA, _ = SampleKind.objects.get_or_create(name="DNA")
        self.extraction_protocol, _ = Protocol.objects.get_or_create(name="Extraction")
        # tube rack 8x12
        self.parent_tube_rack = Container.objects.create(**create_container(barcode='R1234567'))
        # tube
        self.tube_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube02',
                                                                                 barcode='T1234567',
                                                                                 location=self.parent_tube_rack,
                                                                                 coordinates='A01'))

        # individual
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
        # parent sample container
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube04',
                                                                                  barcode='TParent01'))

        self.constants = dict(
            individual=self.valid_individual,
            container=self.tube_container,
            tissue_source=Sample.TISSUE_SOURCE_BLOOD
        )

        # create parent samples
        self.parent_sample = create_fullsample(name="test_sample_11",
                                               alias="sample11",
                                               volume=5000,
                                               sample_kind=self.sample_kind_BLOOD,
                                               individual=self.valid_individual,
                                               container=self.valid_container)
        # create child samples
        self.child_sample = create_fullsample(name="test_sample_11",
                                              alias="sample11",
                                              volume=5000,
                                              sample_kind=self.sample_kind_DNA,
                                              **self.constants)

        self.valid_process = Process.objects.create(protocol=self.extraction_protocol, comment="Process SampleLineage")

    def test_sample_lineage(self):
        parent_sample = self.parent_sample
        pm = ProcessMeasurement.objects.create(process=self.valid_process,
                                               source_sample=parent_sample,
                                               execution_date=timezone.now(),
                                               volume_used=Decimal('0.01'),
                                               comment="ProcessMeasurement test_sample_lineage")
        sl = SampleLineage.objects.create(parent=parent_sample, child=self.child_sample, process_measurement=pm)

        self.assertEqual(self.child_sample.extracted_from.name, "test_sample_11")

    def test_sample_lineage_same_sample(self):
        parent_sample = self.parent_sample
        pm = ProcessMeasurement.objects.create(process=self.valid_process,
                                               source_sample=parent_sample,
                                               execution_date=timezone.now(),
                                               volume_used=Decimal('0.01'),
                                               comment="ProcessMeasurement test_sample_lineage_same_sample")
        with self.assertRaises(ValidationError):
            try:
                sl = SampleLineage.objects.create(parent=parent_sample, child=parent_sample, process_measurement=pm)
            except ValidationError as e:
                self.assertTrue('child' in e.message_dict)
                raise e