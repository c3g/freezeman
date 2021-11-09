from decimal import Decimal
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone


from fms_core.containers import NON_SAMPLE_CONTAINER_KINDS
from fms_core.models import (
    Container,
    Sample,
    Individual,
    Process,
    ProcessMeasurement,
    Protocol,
    SampleKind,
    SampleLineage,
)
from fms_core.tests.constants import (
    create_container,
    create_individual,
    create_sample,
    create_sample_container,
    create_extracted_sample,
)

class FullSampleTest(TestCase):
    """ Test module for full Sample cases (multiple models covered) """

    def setUp(self) -> None:
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01', barcode='T123456'))
        self.wrong_container = Container.objects.create(**create_container(barcode='R123456'))
        self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD")

    def test_sample(self):
        sample = Sample.objects.create(**create_sample(self.sample_kind_BLOOD, self.valid_individual, self.valid_container))
        self.assertEqual(Sample.objects.count(), 1)
        self.assertEqual(sample.is_depleted, "no")
        self.assertEqual(sample.volume, Decimal("5000.000"))
        self.assertEqual(sample.individual_name, "jdoe")
        self.assertEqual(sample.individual_sex, Individual.SEX_UNKNOWN)
        self.assertEqual(sample.individual_taxon, Individual.TAXON_HOMO_SAPIENS)
        self.assertEqual(sample.individual_cohort, "covid-19")
        self.assertEqual(sample.individual_pedigree, "")
        self.assertIsNone(sample.individual_mother)
        self.assertIsNone(sample.individual_father)
        self.assertEqual(sample.container_kind, "tube")
        self.assertEqual(sample.container_name, "TestTube01")
        self.assertIsNone(sample.container_location)
        self.assertEqual(sample.context_sensitive_coordinates, "")
        self.assertIsNone(sample.source_depleted)  # Source depleted is invalid here - not an extracted sample
        self.assertEqual(sample.comment, "")
        self.assertEqual(sample.update_comment, "")


class ExtractedSampleTest(TestCase):

    def setUp(self) -> None:
        self.sample_kind_DNA, _ = SampleKind.objects.get_or_create(name="DNA")
        self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD")
        self.extraction_protocol, _ = Protocol.objects.get_or_create(name="Extraction")
        # tube rack 8x12
        self.parent_tube_rack = Container.objects.create(**create_container(barcode='R123456'))
        # tube
        self.tube_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01',
                                                                                 barcode='T123456',
                                                                                 location=self.parent_tube_rack,
                                                                                 coordinates='C03'))

        self.tube_container_2 = Container.objects.create(**create_sample_container(kind='tube', name='TestTube02',
                                                                                   barcode='T223456',
                                                                                   location=self.parent_tube_rack,
                                                                                   coordinates='C04'))

        # ====== parent sample data ======
        # individual
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
        # parent sample container
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube03',
                                                                                  barcode='TParent01'))
        # create parent samples
        self.parent_sample = Sample.objects.create(**create_sample(sample_kind=self.sample_kind_BLOOD,
                                                                   individual=self.valid_individual,
                                                                   container=self.valid_container,
                                                                   name="test_sample_10"))
        self.invalid_parent_sample = Sample.objects.create(**create_sample(
            sample_kind=self.sample_kind_DNA,
            individual=self.valid_individual,
            container=self.tube_container_2,
            name="test_sample_11",
            concentration=Decimal('1.0'),
        ))

        self.constants = dict(
            individual=self.valid_individual,
            container=self.tube_container,
            tissue_source=Sample.TISSUE_SOURCE_BLOOD
        )

    def test_extracted_sample(self):
        volume_used = Decimal('0.01')
        parent_sample = self.parent_sample
        s = Sample.objects.create(**create_extracted_sample(sample_kind=self.sample_kind_DNA,
                                                            **self.constants))
        p = Process.objects.create(protocol=self.extraction_protocol, comment="Process test_extracted_sample")

        pm = ProcessMeasurement.objects.create(process=p,
                                               source_sample=parent_sample,
                                               execution_date=timezone.now(),
                                               volume_used=volume_used,
                                               comment="ProcessMeasurement test_extracted_sample")
        SampleLineage.objects.create(parent=parent_sample, child=s, process_measurement=pm)
        self.assertFalse(s.source_depleted)
        self.assertEqual(Sample.objects.count(), 3)

        # Should be able to move to a non-tube rack 8x12 now that it's created
        pc = Container.objects.create(**create_container("BOX001", kind="tube box 8x8", name="Box001"))
        s.container.location = pc
        s.save()

    def test_no_tissue_source_extracted_sample(self):
        with self.assertRaises(ValidationError):
            try:
                volume_used = Decimal('0.01')
                parent_sample = self.parent_sample
                s = Sample.objects.create(**create_extracted_sample(
                    self.sample_kind_DNA,
                    **{**self.constants, "tissue_source": ""}
                ))
                p = Process.objects.create(protocol=self.extraction_protocol, comment="Process test_no_tissue_source_extracted_sample")
                pm = ProcessMeasurement.objects.create(process=p,
                                                       source_sample=parent_sample,
                                                       execution_date=timezone.now(),
                                                       volume_used=volume_used,
                                                       comment="ProcessMeasurement test_no_tissue_source_extracted_sample")
                SampleLineage.objects.create(parent=parent_sample, child=s, process_measurement=pm)
            except ValidationError as e:
                self.assertIn("tissue_source", e.message_dict)
                raise e

    def test_original_sample(self):
        with self.assertRaises(ValidationError):
            try:
                volume_used = Decimal('0.01')
                parent_sample=self.invalid_parent_sample
                s = Sample.objects.create(**create_extracted_sample(sample_kind=self.sample_kind_DNA,
                                                                    container=self.tube_container,
                                                                    individual=self.valid_individual,
                                                                    name="test_extracted_sample_11"))
                p = Process.objects.create(protocol=self.extraction_protocol, comment="Process test_original_sample")
                pm = ProcessMeasurement.objects.create(process=p,
                                                       source_sample=parent_sample,
                                                       execution_date=timezone.now(),
                                                       volume_used=volume_used,
                                                       comment="ProcessMeasurement test_original_sample")
                SampleLineage.objects.create(parent=parent_sample, child=s, process_measurement=pm)
            except ValidationError as e:
                self.assertIn("extracted_from", e.message_dict)
                raise e

    def test_no_container(self):
        with self.assertRaises(ValidationError):
            try:
                s = Sample.objects.create(**create_extracted_sample(sample_kind=self.sample_kind_DNA,
                                                                    concentration=Decimal('1.0'),
                                                                    container=None,
                                                                    individual=self.valid_individual,
                                                                    name="test_extracted_sample_no_container"))
                s.full_clean()
            except ValidationError as e:
                self.assertIn("container", e.message_dict)
                raise e

    def test_sample_kind(self):
        # extracted sample can be only of type DNA or RNA
        volume_used = Decimal('0.01')
        parent_sample = self.parent_sample
        invalid_sample_kind = Sample(**create_extracted_sample(sample_kind=self.sample_kind_BLOOD,
                                                               **{**self.constants, "tissue_source": ""}))
        invalid_sample_kind.save()
        p = Process.objects.create(protocol=self.extraction_protocol, comment="Process test_sample_kind")
        pm = ProcessMeasurement.objects.create(process=p,
                                               source_sample=parent_sample,
                                               execution_date=timezone.now(),
                                               volume_used=volume_used,
                                               comment="ProcessMeasurement test_sample_kind")
        with self.assertRaises(ValidationError):
            try:
                SampleLineage.objects.create(parent=parent_sample, child=invalid_sample_kind, process_measurement=pm)
            except ValidationError as e:
                self.assertIn('tissue_source', e.message_dict)
                raise e

    def test_volume_used(self):
        # volume_used cannot be None for an extracted_sample
        volume_used = None
        sample = Sample(**create_extracted_sample(sample_kind=self.sample_kind_DNA,
                                                               **self.constants))
        sample.save()
        p = Process.objects.create(protocol=self.extraction_protocol, comment="Process test_volume_used")
        with self.assertRaises(ValidationError):
            try:
                pm = ProcessMeasurement.objects.create(process=p,
                                                       source_sample=self.parent_sample,
                                                       execution_date=timezone.now(),
                                                       volume_used=volume_used,
                                                       comment="ProcessMeasurement test_volume_used")
                SampleLineage.objects.create(parent=self.parent_sample, child=sample, process_measurement=pm)
            except ValidationError as e:
                self.assertIn('volume_used', e.message_dict)
                raise e

    def test_concentration(self):
        # for DNA or RNA samples concentration cannot be None
        invalid_concentration = Sample(**create_extracted_sample(sample_kind=self.sample_kind_DNA,
                                                                 **self.constants))
        invalid_concentration.concentration = None
        self.assertRaises(ValidationError, invalid_concentration.full_clean)
        self.assertEqual(Sample.objects.count(), 2)

    def test_tissue_source(self):
        # tissue_source can only be specified for DNA and RNA
        invalid_tissue_source = Sample(**create_sample(self.sample_kind_BLOOD, self.valid_individual, self.tube_container,
                                                       tissue_source=Sample.TISSUE_SOURCE_BLOOD))
        with self.assertRaises(ValidationError):
            try:
                invalid_tissue_source.full_clean()
            except ValidationError as e:
                self.assertTrue('tissue_source' in e.message_dict)
                raise e

    def test_negative_volume(self):
        with self.assertRaises(ValidationError):
            try:
                volume_used = Decimal('-0.01')
                parent_sample = self.parent_sample
                negative_volume_used = Sample.objects.create(**create_extracted_sample(sample_kind=self.sample_kind_DNA,
                                                                                       **self.constants))
                p = Process.objects.create(protocol=self.extraction_protocol, comment="Process test_negative_volume")
                pm = ProcessMeasurement.objects.create(process=p,
                                                       source_sample=parent_sample,
                                                       execution_date=timezone.now(),
                                                       volume_used=volume_used,
                                                       comment="ProcessMeasurement test_negative_volume")
                SampleLineage.objects.create(parent=parent_sample, child=negative_volume_used, process_measurement=pm)
            except ValidationError as e:
                self.assertTrue('volume_used' in e.message_dict)
                raise e

    def test_no_individual(self):
        valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTubeNoIndividual',
                                                                                  barcode='TParentNoIndividual'))
        sample_no_individual = Sample.objects.create(**create_sample(sample_kind=self.sample_kind_DNA,
                                                                    concentration=Decimal('1.0'),
                                                                    container=valid_container,
                                                                    individual=None,
                                                                    name="test_sample_no_individual"))

        self.assertEqual(sample_no_individual.name, "test_sample_no_individual")
        self.assertEqual(sample_no_individual.is_depleted, "no")
        self.assertEqual(sample_no_individual.volume, Decimal("5000.000"))
        self.assertEqual(sample_no_individual.container_kind, "tube")
        self.assertEqual(sample_no_individual.container_name, "TestTubeNoIndividual")
        self.assertIsNone(sample_no_individual.container_location)