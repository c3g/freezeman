from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import LibraryPreparationWithSelectionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import SampleKind, LibraryType, LibrarySelection, Platform, ProcessMeasurement, PropertyType, PropertyValue
from fms_core.models._constants import DOUBLE_STRANDED, SINGLE_STRANDED

from fms_core.services.container import create_container
from fms_core.services.sample import create_full_sample, get_sample_from_container, update_qc_flags
from fms_core.services.index import get_or_create_index_set, create_index


class LibraryPreparationWithSelectionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = LibraryPreparationWithSelectionImporter()
        self.file = APP_DATA_ROOT / "Library_preparation_with_selection_v5_8_0.xlsx"
        ContentType.objects.clear_cache()

        self.source_sample_names = ['PHAGE1', 'PHAGE2', 'PHAGE3', 'PHAGE4']
        self.source_sample_container_barcode = 'PHAGEPLATESERUM'
        self.source_sample_coordinates = ['A01', 'B01', 'C01', 'D01']
        self.source_sample_initial_volume = 100

        self.library_type_batch_1 = LibraryType.objects.get(name="PhIP-Seq")
        self.platform_batch_1 = Platform.objects.get(name="ILLUMINA")

        # Get library selection objects
        self.library_selection_batch_1 = LibrarySelection.objects.get(
            name="Phage_Display", target="Human Proteome"
        )

        # Create indices
        (index_set, _, errors, warnings) = get_or_create_index_set(set_name="Illumina_IDT_TruSeq_DNA_RNA_UD")
        (self.index_1, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqLT",
                                                        index_name="UDI70001-UDI50001")
        (self.index_2, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqLT",
                                                        index_name="UDI70002-UDI50002")
        (self.index_3, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqLT",
                                                        index_name="UDI70003-UDI50003")
        (self.index_4, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqLT",
                                                        index_name="UDI70004-UDI50004")

        self.library_batch_1 = dict(
            ID='batch_1',
            library_type=self.library_type_batch_1,
            library_selection=self.library_selection_batch_1,
            date='2026-06-09',
            platform=self.platform_batch_1,
            batch_comment='Library Batch with Selection Comment',
            library_technician_name='Esen Sokullu',
            bacteriophage='T7',
            library_diversity='1414',
            peptides_size='234',
            overlaps_size='12',
            library_kit_used='Lucigen NXSEQ AMPFREE',
            library_kit_lot='41242656',
            thermocycler_used='Applied Biosystems SimpliAmp - room 6400',
            pcr_cycles='4',
            pcr_enzyme_used='AGILENT- Herculase II Fusion DNA polymerase',
            pcr_enzyme_lot='36473'
        )


        self.libraries = []
        self.libraries.append(dict(
            **self.library_batch_1,
            library_container_barcode='PHAGEPLATELIB',
            library_container_name='PHAGEPLATELIB',
            library_container_kind='96-well plate',
            volume_used=2,
            library_volume=2,
            index=self.index_1,
            strandedness=DOUBLE_STRANDED,
            library_comment='Library with Selection 1 Comment'
        ))

        self.libraries.append(dict(
            **self.library_batch_1,
            library_container_barcode='PHAGEPLATELIB',
            library_container_name='PHAGEPLATELIB',
            library_container_kind='96-well plate',
            volume_used=4,
            library_volume=3,
            index=self.index_2,
            strandedness=DOUBLE_STRANDED,
            library_comment='Library with Selection 2 Comment'
        ))

        self.libraries.append(dict(
            **self.library_batch_1,
            library_container_barcode='PHAGEPLATELIB',
            library_container_name='PHAGEPLATELIB',
            library_container_kind='96-well plate',
            volume_used=5,
            library_volume=5,
            index=self.index_3,
            strandedness=DOUBLE_STRANDED,
            library_comment='Library with Selection 3 Comment'
        ))

        self.libraries.append(dict(
            **self.library_batch_1,
            library_container_barcode='PHAGEPLATELIB',
            library_container_name='PHAGEPLATELIB',
            library_container_kind='96-well plate',
            volume_used=10,
            library_volume=10,
            index=self.index_4,
            strandedness=DOUBLE_STRANDED,
            library_comment='Library with Selection 4 Comment'
        ))

        self.prefill_data()


    def prefill_data(self):
        self.sample_kind_source, _ = SampleKind.objects.get_or_create(name='SERUM', is_extracted=False)
        self.sample_kind_library, _ = SampleKind.objects.get_or_create(name='DNA', is_extracted=True)

        (container, errors, warnings) = create_container(barcode=self.source_sample_container_barcode,
                                                         kind='96-well plate',
                                                         name='Container4LibrarySelectionPrep')
        for i, sample_name in enumerate(self.source_sample_names):
            (source_sample, errors, warnings) = \
                create_full_sample(name=sample_name, volume=self.source_sample_initial_volume, concentration=25,
                                collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                                container=container, coordinates=self.source_sample_coordinates[i], sample_kind=self.sample_kind_source)

            update_qc_flags(source_sample, "Passed", "Passed")

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        for i, library in enumerate(self.libraries):
            # Test source sample
            source_sample, _, _ = get_sample_from_container(barcode=self.source_sample_container_barcode, coordinates=self.source_sample_coordinates[i])
            new_volume = self.source_sample_initial_volume - library['volume_used']
            self.assertIsNotNone(source_sample)
            self.assertEqual(source_sample.volume, new_volume)
            self.assertEqual(source_sample.quantity_flag, True)
            self.assertEqual(source_sample.quality_flag, True)

            # Test library with selection
            sample_library, _, _ = get_sample_from_container(barcode='PHAGEPLATELIB', coordinates=self.source_sample_coordinates[i])
            self.assertIsNotNone(sample_library)
            self.assertEqual(sample_library.volume, library['library_volume'])
            self.assertEqual(sample_library.concentration, None)
            self.assertEqual(sample_library.quality_flag, None)
            self.assertEqual(sample_library.quantity_flag, None)

            for derived_sample in sample_library.derived_samples.all():
                library_obj = derived_sample.library
                # Ensure sample kind was set to DNA
                self.assertEqual(derived_sample.sample_kind, self.sample_kind_library)
                # Library info tests
                self.assertEqual(library_obj.library_type, library['library_type'])
                self.assertEqual(library_obj.library_selection, library['library_selection'])
                self.assertEqual(library_obj.platform, library['platform'])
                self.assertEqual(library_obj.index, library['index'])
                self.assertEqual(library_obj.strandedness, library['strandedness'])

            # Process and process measurements tests
            pm_1 = ProcessMeasurement.objects.get(source_sample=source_sample,
                                                execution_date=library['date'],
                                                volume_used=library['volume_used'])
            self.assertEqual(pm_1.volume_used, library['volume_used'])
            self.assertEqual(pm_1.comment, library['library_comment'])
            self.assertEqual(pm_1.process.protocol.name, 'Library Preparation with Selection')
            self.assertEqual(pm_1.process.comment, library['batch_comment'])

            # Property Values tests
            pt_1 = PropertyType.objects.get(name='Library Technician Name', object_id=pm_1.process.protocol.id)
            p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_1.process.id)

            pt_2 = PropertyType.objects.get(name='Bacteriophage', object_id=pm_1.process.protocol.id)
            p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_1.process.id)

            pt_3 = PropertyType.objects.get(name='Library Diversity', object_id=pm_1.process.protocol.id)
            p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_1.process.id)

            pt_4 = PropertyType.objects.get(name='Peptides Size', object_id=pm_1.process.protocol.id)
            p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_1.process.id)

            pt_5 = PropertyType.objects.get(name='Overlaps Size', object_id=pm_1.process.protocol.id)
            p_5 = PropertyValue.objects.get(property_type_id=pt_5, object_id=pm_1.process.id)

            pt_6 = PropertyType.objects.get(name='Library Kit Used', object_id=pm_1.process.protocol.id)
            p_6 = PropertyValue.objects.get(property_type_id=pt_6, object_id=pm_1.process.id)

            pt_7 = PropertyType.objects.get(name='Library Kit Lot', object_id=pm_1.process.protocol.id)
            p_7 = PropertyValue.objects.get(property_type_id=pt_7, object_id=pm_1.process.id)

            pt_8 = PropertyType.objects.get(name='Thermocycler Used', object_id=pm_1.process.protocol.id)
            p_8 = PropertyValue.objects.get(property_type_id=pt_8, object_id=pm_1.process.id)

            pt_9 = PropertyType.objects.get(name='PCR Cycles', object_id=pm_1.process.protocol.id)
            p_9 = PropertyValue.objects.get(property_type_id=pt_9, object_id=pm_1.process.id)

            pt_10 = PropertyType.objects.get(name='PCR Enzyme Used', object_id=pm_1.process.protocol.id)
            p_10 = PropertyValue.objects.get(property_type_id=pt_10, object_id=pm_1.process.id)

            pt_11 = PropertyType.objects.get(name='PCR Enzyme Lot', object_id=pm_1.process.protocol.id)
            p_11 = PropertyValue.objects.get(property_type_id=pt_11, object_id=pm_1.process.id)

            self.assertEqual(p_1.value, library['library_technician_name'])
            self.assertEqual(p_2.value, library['bacteriophage'])
            self.assertEqual(p_3.value, library['library_diversity'])
            self.assertEqual(p_4.value, library['peptides_size'])
            self.assertEqual(p_5.value, library['overlaps_size'])
            self.assertEqual(p_6.value, library['library_kit_used'])
            self.assertEqual(p_7.value, library['library_kit_lot'])
            self.assertEqual(p_8.value, library['thermocycler_used'])
            self.assertEqual(p_9.value, library['pcr_cycles'])
            self.assertEqual(p_10.value, library['pcr_enzyme_used'])
            self.assertEqual(p_11.value, library['pcr_enzyme_lot'])
