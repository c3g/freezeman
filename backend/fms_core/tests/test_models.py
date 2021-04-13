from decimal import Decimal
import json
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.test import TestCase
from django.utils import timezone
import reversion
from ..containers import NON_SAMPLE_CONTAINER_KINDS
from ..models import Container, Sample, Individual, Process, ProcessSample, Protocol,SampleKind, SampleLineage
from .constants import (
    create_container,
    create_individual,
    create_sample,
    create_sample_container,
    create_extracted_sample,
)


class ContainerTest(TestCase):
    """ Test module for Container model """

    def setUp(self):
        pass

    def test_container(self):
        Container.objects.create(**create_container(barcode='R123456'))
        created_valid_container = Container.objects.get(name='TestRack001')
        self.assertEqual(created_valid_container.barcode, 'R123456')

    def test_same_coordinates(self):
        rack = Container.objects.create(**create_container(barcode='R123456'))
        Container.objects.create(**create_container(location=rack, barcode='R123457', coordinates="A01", kind="tube",
                                                    name="tube01"))
        with self.assertRaises(ValidationError):
            try:
                Container.objects.create(**create_container(location=rack, barcode='R123458', coordinates="A01",
                                                            kind="tube", name="tube02"))
            except ValidationError as e:
                self.assertIn("coordinates", e.message_dict)
                raise e

    def test_non_existent_parent(self):
        with self.assertRaises(ObjectDoesNotExist):
            Container.objects.create(**create_container(
                barcode='R123456',
                location=Container.objects.get(barcode='RandomNonExistentBarcode')
            ))

    def test_coordinates_without_location(self):
        with self.assertRaises(ValidationError):
            try:
                c = create_container(barcode="Barcode001")
                c["coordinates"] = "A01"
                Container.objects.create(**c)
            except ValidationError as e:
                self.assertIn("coordinates", e.message_dict)
                raise e

    def test_invalid_parent_coordinates(self):
        parent_container = Container.objects.create(**create_container(barcode='ParentBarcode01'))
        with self.assertRaises(ValidationError):
            Container.objects.create(**create_container(
                barcode="Barcode002",
                location=parent_container,
                coordinates="Z99",
                kind="tube",
            ))

    def test_location_equal_barcode(self):
        parent_container = Container.objects.create(**create_container(barcode='ParentBarcode01'))
        invalid_container = Container(**create_container(barcode='ParentBarcode01',
                                                         location=parent_container))
        self.assertRaises(ValidationError, invalid_container.full_clean)

    def test_container_hierarchy(self):
        # create parent container tube rack, tube rack can only have a tube inside
        parent_container = Container.objects.create(
            kind='Tube Rack 8x12',
            name='ParentRack001',
            barcode='ParentBarcode01'
        )
        # also tube rack kind - tube rack cannot contain tube rack
        valid_container = Container(**create_container(barcode='R123456', location=parent_container))
        with self.assertRaises(ValidationError):
            valid_container.full_clean()
        self.assertEqual(Container.objects.count(), 1)
        self.assertEqual(Container.objects.all()[0].barcode, 'ParentBarcode01')

    # coordinates tested in a separate file


class SampleTest(TestCase):
    """ Test module for Sample model """

    def setUp(self) -> None:
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01',
                                                                                  barcode='T123456'))
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

    def test_plates_with_coordinates(self):
        # sample can be in plates and tube only
        for i, container_kind in enumerate(('96-well plate', '384-well plate')):
            plate_container = Container.objects.create(**create_sample_container(container_kind,
                                                                                 name=f'Test_name_{i}',
                                                                                 barcode=f'Barcode_{i}'))
            sample_in_plate_container = Sample(**create_sample(self.sample_kind_BLOOD, self.valid_individual, plate_container,
                                                               coordinates="A11"))
            sample_in_plate_container.full_clean()
            sample_in_plate_container.save()

            with self.assertRaises(ValidationError):
                try:
                    # Should not be able to create a sample in the same place
                    Sample.objects.create(**create_sample(self.sample_kind_BLOOD, self.valid_individual, plate_container,
                                                          coordinates="A11", name="test_sample_02"))
                except ValidationError as e:
                    self.assertIn("container", e.message_dict)
                    raise e

        self.assertEqual(Sample.objects.count(), 2)

    def test_wrong_container_kind(self):
        # sample cannot be in containers of those types
        for i, container_kind in enumerate(NON_SAMPLE_CONTAINER_KINDS):
            invalid_container_kind = Container.objects.create(**create_sample_container(container_kind,
                                                                                        name=f'Test_name_{i}',
                                                                                        barcode=f'Barcode_{i}'))
            sample_in_invalid_container_kind = Sample(**create_sample(self.sample_kind_BLOOD, self.valid_individual,
                                                                      invalid_container_kind))
            self.assertRaises(ValidationError, sample_in_invalid_container_kind.full_clean)


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

        ps = ProcessSample.objects.create(process=p,
                                          source_sample=parent_sample,
                                          execution_date=timezone.now(),
                                          volume_used=volume_used,
                                          comment="ProcessSample test_extracted_sample")
        SampleLineage.objects.create(parent=parent_sample, child=s, process_sample=ps)
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
                ps = ProcessSample.objects.create(process=p,
                                                  source_sample=parent_sample,
                                                  execution_date=timezone.now(),
                                                  volume_used=volume_used,
                                                  comment="ProcessSample test_no_tissue_source_extracted_sample")
                SampleLineage.objects.create(parent=parent_sample, child=s, process_sample=ps)
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
                ps = ProcessSample.objects.create(process=p,
                                                  source_sample=parent_sample,
                                                  execution_date=timezone.now(),
                                                  volume_used=volume_used,
                                                  comment="ProcessSample test_original_sample")
                SampleLineage.objects.create(parent=parent_sample, child=s, process_sample=ps)
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
        ps = ProcessSample.objects.create(process=p,
                                          source_sample=parent_sample,
                                          execution_date=timezone.now(),
                                          volume_used=volume_used,
                                          comment="ProcessSample test_sample_kind")
        with self.assertRaises(ValidationError):
            try:
                SampleLineage.objects.create(parent=parent_sample, child=invalid_sample_kind, process_sample=ps)
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
                ps = ProcessSample.objects.create(process=p,
                                                  source_sample=self.parent_sample,
                                                  execution_date=timezone.now(),
                                                  volume_used=volume_used,
                                                  comment="ProcessSample test_volume_used")
                SampleLineage.objects.create(parent=self.parent_sample, child=sample, process_sample=ps)
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
                ps = ProcessSample.objects.create(process=p,
                                                  source_sample=parent_sample,
                                                  execution_date=timezone.now(),
                                                  volume_used=volume_used,
                                                  comment="ProcessSample test_negative_volume")                                                                       
                SampleLineage.objects.create(parent=parent_sample, child=negative_volume_used, process_sample=ps)
            except ValidationError as e:
                self.assertTrue('volume_used' in e.message_dict)
                raise e


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
        self.parent_sample = Sample.objects.create(**create_sample(sample_kind=self.sample_kind_BLOOD,
                                                                   individual=self.valid_individual,
                                                                   container=self.valid_container,
                                                                   name="test_sample_11"))
        # create child samples
        self.child_sample = Sample.objects.create(**create_extracted_sample(sample_kind=self.sample_kind_DNA,
                                                                            **self.constants))
        self.valid_process = Process.objects.create(protocol=self.extraction_protocol, comment="Process SampleLineage")

    def test_sample_lineage(self):
        parent_sample = self.parent_sample
        ps = ProcessSample.objects.create(process=self.valid_process,
                                          source_sample=parent_sample,
                                          execution_date=timezone.now(),
                                          volume_used=Decimal('0.01'),
                                          comment="ProcessSample test_sample_lineage")          
        sl = SampleLineage.objects.create(parent=parent_sample, child=self.child_sample, process_sample=ps)

        self.assertEqual(self.child_sample.extracted_from.name, "test_sample_11")


class IndividualTest(TestCase):

    def test_individual(self):
        individual = Individual.objects.create(**create_individual(individual_name="jdoe"))
        self.assertEqual(Individual.objects.count(), 1)
        self.assertEqual(str(individual), "jdoe")

    def test_mother_father(self):
        # individual id can't be mother id and can't be father id
        mother = Individual.objects.create(**create_individual(individual_name='janedoe'))
        father = Individual.objects.create(**create_individual(individual_name='johndoe'))
        individual = Individual(**create_individual(individual_name='janedoe', mother=mother))

        with self.assertRaises(ValidationError):
            try:
                individual.full_clean()
            except ValidationError as e:
                self.assertIn('name', e.message_dict)
                raise e

        individual = Individual(**create_individual(individual_name='johndoe', father=father))

        with self.assertRaises(ValidationError):
            try:
                individual.full_clean()
            except ValidationError as e:
                self.assertIn('name', e.message_dict)
                raise e

        # mother and father can't be the same individual
        individual = Individual(**create_individual(individual_name='jdoe', mother=mother, father=mother))

        with self.assertRaises(ValidationError):
            try:
                individual.full_clean()
            except ValidationError as e:
                for mf in ('mother', 'father'):
                    self.assertIn(mf, e.message_dict)
                raise e

    def test_pedigree(self):
        # pedigree must match for trio
        mother = Individual.objects.create(**create_individual(individual_name='janedoe', pedigree='p1'))
        father = Individual.objects.create(**create_individual(individual_name='johndoe', pedigree='p1'))

        with self.assertRaises(ValidationError):
            try:
                Individual.objects.create(**create_individual(individual_name='jimdoe', mother=mother, father=father,
                                                              pedigree='p2'))
            except ValidationError as e:
                self.assertIn("pedigree", e.message_dict)
                raise e


class TrackedTest(TestCase):
    """ Test module for tracked_model abstract model. """

    def setUp(self):
        pass
        # from ..signals import register_signal_handlers
        # register_signal_handlers()

    def test_tracked_fields(self):
        # Uses container child to test base class functionality
        Container.objects.create(**create_container(barcode='ZZZ1313', name='BigBrother'))
        created_valid_container = Container.objects.get(name='BigBrother')
        self.assertEqual(created_valid_container.barcode, 'ZZZ1313')
        self.assertEqual(created_valid_container.created_by.username, 'biobankadmin') # tests for biobankadmin user which is the default user
        self.assertIsNotNone(created_valid_container.created_at) # tests if the create time is set
        self.assertEqual(created_valid_container.updated_by.username, 'biobankadmin') # tests for biobankadmin user which is the default user
        self.assertIsNotNone(created_valid_container.updated_at) # tests if the updated time is set
        old_update_time = created_valid_container.updated_at
        created_valid_container.name = 'LilBrother'
        created_valid_container.save()
        self.assertGreater(created_valid_container.updated_at, old_update_time) # tests if the update time is updated

    def test_saved_revision_on_delete(self):
        # Test is the a version is saved on deletion of the object
        with reversion.create_revision():
            Container.objects.create(**create_container(barcode='ZZZ3131', name='ghostContainer'))
        created_valid_container = Container.objects.get(name='ghostContainer')
        container_id = str(created_valid_container.id)
        initial_container_version = reversion.models.Version.objects.filter(object_id=container_id).first()
        data = json.loads(initial_container_version.serialized_data)
        isDeleted = data[0]["fields"].pop("deleted", True)
        self.assertEqual(isDeleted, False)

        Container.objects.get(id=container_id).delete()
        deleted_container_version = reversion.models.Version.objects.filter(object_id=container_id).first()
        data = json.loads(deleted_container_version.serialized_data)
        isDeleted = data[0]["fields"].pop("deleted", False)
        self.assertEqual(isDeleted, True)


class ProtocolTest(TestCase):
    def setUp(self):
        self.protocol = Protocol.objects.create(name="myprotocol")

    def test_protocol(self):
        self.assertEqual(self.protocol.name, "myprotocol")

    def test_no_protocol_name(self):
        with self.assertRaises(ValidationError):
            try:
                Protocol.objects.create()
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_existing_protocol_name(self):
        with self.assertRaises(ValidationError):
            try:
                Protocol.objects.create(name="myprotocol")
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

class ProcessTest(TestCase):
    def setUp(self):
        self.protocol, _ = Protocol.objects.get_or_create(name="Update")

    def test_process(self):
        process = Process.objects.create(protocol=self.protocol, comment="mycomment")
        self.assertEqual(process.protocol.name, self.protocol.name)
        self.assertEqual(process.comment, "mycomment")

    def test_missing_protocol(self):
        with self.assertRaises(ValidationError):
            try:
                Process.objects.create(comment="mycomment")
            except ValidationError as e:
                self.assertTrue('protocol' in e.message_dict)
                raise e

class ProcessSampleTest(TestCase):
    def setUp(self):
        self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD")

        self.individual = Individual.objects.create(**create_individual(individual_name='jdoe'))

        self.tube_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube04',
                                                                                  barcode='TParent01'))

        self.source_sample = Sample.objects.create(**create_sample(sample_kind=self.sample_kind_BLOOD,
                                                                   individual=self.individual,
                                                                   container=self.tube_container,
                                                                   name="test_source_sample"))

        self.extraction_protocol, _ = Protocol.objects.get_or_create(name="Extraction")
        self.update_protocol, _ = Protocol.objects.get_or_create(name="Update")
        self.process = Process.objects.create(protocol=self.update_protocol, comment="Process for Protocol Update Test")


    def test_process_sample(self):
        ps = ProcessSample.objects.create(process=self.process,
                                          source_sample=self.source_sample,
                                          volume_used=None,
                                          comment="Test comment")
        self.assertEqual(ps.volume_used, None)
        self.assertEqual(ps.comment, "Test comment")
        self.assertEqual(ps.process.id, self.process.id)
        self.assertEqual(ps.process.protocol.name, self.process.protocol.name)
        self.assertEqual(ps.source_sample, self.source_sample)


    def test_missing_process(self):
        with self.assertRaises(Process.DoesNotExist):
            ProcessSample.objects.create(source_sample=self.source_sample,
                                         volume_used=None,
                                         comment="Test comment")

    def test_missing_source_sample(self):
        with self.assertRaises(ValidationError):
            try:
                ProcessSample.objects.create(process=self.process,
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
                ProcessSample.objects.create(process=process,
                                             source_sample=self.source_sample,
                                             comment="Test comment")
            except ValidationError as e:
                self.assertTrue('volume_used' in e.message_dict)
                raise e