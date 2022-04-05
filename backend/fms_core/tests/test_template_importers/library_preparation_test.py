from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import LibraryPreparationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import SampleKind, LibraryType, Platform, Index, ProcessMeasurement, PropertyType, PropertyValue
from fms_core.models._constants import DOUBLE_STRANDED, SINGLE_STRANDED

from fms_core.services.container import create_container
from fms_core.services.sample import create_full_sample, get_sample_from_container, update_qc_flags


class LibraryPreparationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = LibraryPreparationImporter()
        self.file = APP_DATA_ROOT / "Library_preparation_v3_8_0.xlsx"
        ContentType.objects.clear_cache()

        self.source_sample_name = 'sample_source'
        self.source_sample_initial_volume = 100
        self.source_sample_container_barcode = 'SOURCECONTAINER4LIBRARYPREP'

        self.library_type_batch_1 = LibraryType.objects.get(name="PCR-free")
        self.library_type_batch_2 = LibraryType.objects.get(name="PCR-enriched")
        self.platform_batch_1 = Platform.objects.get(name="DNBSEQ")
        self.platform_batch_2 = Platform.objects.get(name="ILLUMINA")

        self.index_1 = Index.objects.get(name="Index_1")
        self.index_2 = Index.objects.get(name="Index_2")
        self.index_3 = Index.objects.get(name="Index_3")

        self.library_batch_1 = dict(
            ID='batch_1',
            library_type=self.library_type_batch_1,
            date='2022-03-16',
            platform=self.platform_batch_1,
            batch_comment='Library Batch Comment',
            library_technician_name='Tony Tir',
            shearing_technician_name='Elizabeth Caron',
            library_kit_used='Illumina Tagmentation',
            library_kit_lot='1',
        )

        self.library_batch_2 = dict(
            ID='batch_2',
            library_type=self.library_type_batch_2,
            date='2022-03-17',
            platform=self.platform_batch_2,
            batch_comment='Library Batch Comment 2',
            library_technician_name='Janick St-Cyr',
            library_kit_used='Lucigen NXSEQ AMPFREE',
            library_kit_lot='2',
        )

        self.library_1 = dict(
            **self.library_batch_1,
            library_container_barcode='Container4Library1',
            library_container_name='Container4Library1',
            library_container_kind='Tube',
            volume_used=2,
            library_volume=2,
            index=self.index_1,
            strandedness=DOUBLE_STRANDED,
            library_comment='Library 1 Comment'
        )

        self.library_2 = dict(
            **self.library_batch_1,
            library_container_barcode='Container4Library2',
            library_container_name='Container4Library2',
            library_container_kind='Tube',
            volume_used=4,
            library_volume=3,
            index=self.index_2,
            strandedness=SINGLE_STRANDED,
            library_comment='Library 2 Comment'
        )

        self.library_3 = dict(
            **self.library_batch_2,
            library_container_barcode='Container4Library3',
            library_container_name='Container4Library3',
            library_container_kind='Tube',
            volume_used=5,
            library_volume=5,
            index=self.index_3,
            strandedness=DOUBLE_STRANDED,
            library_comment='Library 3 Comment'
        )

        self.prefill_data()


    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')

        (container, errors, warnings) = create_container(barcode=self.source_sample_container_barcode,
                                                         kind='Tube',
                                                         name='Container4LibraryPrep')

        (source_sample, errors, warnings) = \
            create_full_sample(name=self.source_sample_name, volume=self.source_sample_initial_volume, concentration=25,
                               collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                               container=container, sample_kind=sample_kind)

        update_qc_flags(source_sample, "Passed", "Passed")


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Test source sample
        source_sample, _, _ = get_sample_from_container(barcode=self.source_sample_container_barcode)
        new_volume = self.source_sample_initial_volume - self.library_1['volume_used'] - self.library_2['volume_used'] - self.library_3['volume_used']
        self.assertEqual(source_sample.volume, new_volume)

        # Test first library
        sample_library_1, _, _ = get_sample_from_container(barcode='Container4Library1')
        library_1 = sample_library_1.derived_sample_not_pool.library

        self.assertEqual(sample_library_1.volume, self.library_1['library_volume'])
        self.assertEqual(sample_library_1.quality_flag, None)
        self.assertEqual(sample_library_1.quantity_flag, None)

        # Library info tests
        self.assertEqual(library_1.library_type, self.library_1['library_type'])
        self.assertEqual(library_1.platform, self.library_1['platform'])
        self.assertEqual(library_1.index, self.library_1['index'])
        self.assertEqual(library_1.strandedness, self.library_1['strandedness'])

        # Process and process measurements tests
        pm_1 = ProcessMeasurement.objects.get(source_sample=source_sample,
                                              execution_date=self.library_1['date'],
                                              volume_used=self.library_1['volume_used'])
        self.assertEqual(pm_1.volume_used, self.library_1['volume_used'])
        self.assertEqual(pm_1.comment, self.library_1['library_comment'])
        self.assertEqual(pm_1.process.protocol.name, 'Library Preparation')
        self.assertEqual(pm_1.process.comment, self.library_1['batch_comment'])

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Library Technician Name', object_id=pm_1.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_1.process.id)

        pt_2 = PropertyType.objects.get(name='Library Kit Used', object_id=pm_1.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_1.process.id)

        pt_3 = PropertyType.objects.get(name='Library Kit Lot', object_id=pm_1.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_1.process.id)

        pt_4 = PropertyType.objects.get(name='Shearing Technician Name', object_id=pm_1.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_1.process.id)

        self.assertEqual(p_1.value, self.library_1['library_technician_name'])
        self.assertEqual(p_2.value, self.library_1['library_kit_used'])
        self.assertEqual(p_3.value, self.library_1['library_kit_lot'])
        self.assertEqual(p_4.value, self.library_1['shearing_technician_name'])

        # Test second library
        sample_library_2, _, _ = get_sample_from_container(barcode='Container4Library2')
        library_2 = sample_library_2.derived_sample_not_pool.library

        self.assertEqual(sample_library_2.volume, self.library_2['library_volume'])
        self.assertEqual(sample_library_2.quality_flag, None)
        self.assertEqual(sample_library_2.quantity_flag, None)

        # Library info tests
        self.assertEqual(library_2.library_type, self.library_2['library_type'])
        self.assertEqual(library_2.platform, self.library_2['platform'])
        self.assertEqual(library_2.index, self.library_2['index'])
        self.assertEqual(library_2.strandedness, self.library_2['strandedness'])

        # Process and process measurements tests
        pm_2 = ProcessMeasurement.objects.get(source_sample=source_sample,
                                              execution_date=self.library_2['date'],
                                              volume_used=self.library_2['volume_used'])
        self.assertEqual(pm_2.volume_used, self.library_2['volume_used'])
        self.assertEqual(pm_2.comment, self.library_2['library_comment'])
        self.assertEqual(pm_2.process.protocol.name, 'Library Preparation')
        self.assertEqual(pm_2.process.comment, self.library_2['batch_comment'])

        # Test if pm_2' process and pm_1's process are the same since they come from the same batch
        self.assertEqual(pm_1.process, pm_2.process)
        
        # Test third library
        sample_library_3, _, _ = get_sample_from_container(barcode='Container4Library3')
        library_3 = sample_library_3.derived_sample_not_pool.library

        self.assertEqual(sample_library_3.volume, self.library_3['library_volume'])
        self.assertEqual(sample_library_3.quality_flag, None)
        self.assertEqual(sample_library_3.quantity_flag, None)


        # Library info tests
        self.assertEqual(library_3.library_type, self.library_3['library_type'])
        self.assertEqual(library_3.platform, self.library_3['platform'])
        self.assertEqual(library_3.index, self.library_3['index'])
        self.assertEqual(library_3.strandedness, self.library_3['strandedness'])

        # Process and process measurements tests
        pm_3 = ProcessMeasurement.objects.get(source_sample=source_sample,
                                              execution_date=self.library_3['date'],
                                              volume_used=self.library_3['volume_used'])
        self.assertEqual(pm_3.volume_used, self.library_3['volume_used'])
        self.assertEqual(pm_3.comment, self.library_3['library_comment'])
        self.assertEqual(pm_3.process.protocol.name, 'Library Preparation')
        self.assertEqual(pm_3.process.comment, self.library_3['batch_comment'])

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Library Technician Name', object_id=pm_3.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_3.process.id)

        pt_2 = PropertyType.objects.get(name='Library Kit Used', object_id=pm_3.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_3.process.id)

        pt_3 = PropertyType.objects.get(name='Library Kit Lot', object_id=pm_3.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_3.process.id)

        pt_4 = PropertyType.objects.get(name='Shearing Technician Name', object_id=pm_3.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_3.process.id)

        self.assertEqual(p_1.value, self.library_3['library_technician_name'])
        self.assertEqual(p_2.value, self.library_3['library_kit_used'])
        self.assertEqual(p_3.value, self.library_3['library_kit_lot'])
        self.assertEqual(p_4.value, ' ')


