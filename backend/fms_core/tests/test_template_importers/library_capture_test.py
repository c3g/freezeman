from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime
from decimal import Decimal

from fms_core.template_importer.importers import LibraryCaptureImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import SampleKind, Protocol, Process, ProcessMeasurement, PropertyType, PropertyValue
from fms_core.models._constants import DOUBLE_STRANDED

from fms_core.services.container import create_container
from fms_core.services.sample import create_full_sample, update_qc_flags, pool_samples, get_sample_from_container
from fms_core.services.library import create_library, get_library_type, get_library_selection
from fms_core.services.platform import get_platform
from fms_core.services.index import get_or_create_index_set, create_index


class LibraryCaptureTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = LibraryCaptureImporter()
        self.file = APP_DATA_ROOT / "Library_capture_v4_1_0.xlsx"
        ContentType.objects.clear_cache()

        self.source_sample_name_1 = 'lib_pcr_free'
        self.source_sample_name_2 = 'lib_pcr_enriched'
        self.source_sample_initial_volume = 1000
        self.source_pool_initial_volume = 100
        self.source_sample_container_barcode_1 = 'SOURCELIB1TUBE'
        self.source_sample_container_barcode_2 = 'SOURCELIB2TUBE'
        self.source_pool_container_barcode_3 = 'SOURCEPOOLTUBE'

        self.platform_illumina, _, _ = get_platform(name="ILLUMINA")
        self.library_selection, _, _ = get_library_selection(name="Capture", target="MCC")
        self.library_pcr_free, _, _ = get_library_type(name="PCR-free")
        self.library_pcr_enriched, _, _ = get_library_type(name="PCR-enriched")
        
        self.library_batch_1 = dict(
            ID='1',
            date='2022-02-14',
            capture_type='MCC',
            platform=self.platform_illumina,
            library_selection=self.library_selection,
            batch_comment='Capture test',
            technician_name='Patrick Willett',
            kit_used='MCC-Seq',
            kit_lot='2g32g3rf',
            baits_used='MCC-Seq ImmuneV2 (ImmuneV3B)',
            thermocycler_used='Eppendorf 1',
            pcr_cycles='2',
            pcr_enzyme='KAPA HiFi HotStart Polymerase',
            pcr_enzyme_lot='geg5ujhge'
        )

        self.library_1 = dict(
            **self.library_batch_1,
            library_source_container_barcode=self.source_sample_container_barcode_1,
            library_source_container_name=self.source_sample_container_barcode_1,
            library_source_container_kind='Tube',
            library_destination_container_barcode='CAPTURELIB1TUBE',
            library_destination_container_coord=None,
            library_destination_container_name='CAPTURELIB1TUBE',
            library_destination_container_kind='Tube',
            volume_used=10,
            library_volume=500,
            library_comment='Captured lib 1'
        )

        self.library_2 = dict(
            **self.library_batch_1,
            library_source_container_barcode=self.source_sample_container_barcode_2,
            library_source_container_name=self.source_sample_container_barcode_2,
            library_source_container_kind='Tube',
            library_destination_container_barcode='CAPTURELIB2TUBE',
            library_destination_container_coord=None,
            library_destination_container_name='CAPTURELIB2TUBE',
            library_destination_container_kind='Tube',
            volume_used=20,
            library_volume=100,
            library_comment='Captured lib 2'
        )

        self.pool_1 = dict(
            **self.library_batch_1,
            library_source_container_barcode=self.source_pool_container_barcode_3,
            library_source_container_name=self.source_pool_container_barcode_3,
            library_source_container_kind='Tube',
            library_destination_container_barcode='CAPTUREPOOLTUBE',
            library_destination_container_coord=None,
            library_destination_container_name='CAPTUREPOOLTUBE',
            library_destination_container_kind='Tube',
            volume_used=10,
            library_volume=1000,
            library_comment='Captured pool'
        )

        self.prefill_data()

    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')

        (container_1, _, _) = create_container(barcode=self.source_sample_container_barcode_1,
                                               kind='Tube',
                                               name=self.source_sample_container_barcode_1)
        
        (container_2, _, _) = create_container(barcode=self.source_sample_container_barcode_2,
                                               kind='Tube',
                                               name=self.source_sample_container_barcode_2)

        (pool_container_3, _, _) = create_container(barcode=self.source_pool_container_barcode_3,
                                                    kind='Tube',
                                                    name=self.source_pool_container_barcode_3)

        # Create indices
        (index_set, _, _, _) = get_or_create_index_set(set_name="IDT_10nt_UDI_TruSeq_Adapter")
        (index_1, _, _) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                       index_name="IDT_10nt_UDI_i7_001-IDT_10nt_UDI_i5_001")
        (index_2, _, _) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                       index_name="IDT_10nt_UDI_i7_002-IDT_10nt_UDI_i5_002")

        (library_1, _, _) = create_library(index=index_1,
                                           library_type=self.library_pcr_free,
                                           platform=self.platform_illumina,
                                           strandedness=DOUBLE_STRANDED)

        (library_2, _, _) = create_library(index=index_2,
                                           library_type=self.library_pcr_enriched,
                                           platform=self.platform_illumina,
                                           strandedness=DOUBLE_STRANDED)

        (source_sample_1, _, _) = \
            create_full_sample(name=self.source_sample_name_1, volume=self.source_sample_initial_volume, concentration=20,
                               collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                               container=container_1, sample_kind=sample_kind, library=library_1)

        (source_sample_2, _, _) = \
            create_full_sample(name=self.source_sample_name_2, volume=self.source_sample_initial_volume, concentration=40,
                               collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                               container=container_2, sample_kind=sample_kind, library=library_2)

        # Create objects for the pooling test
        self.samples_to_pool_info = [
            {
                'Source Sample': source_sample_1,
                'Volume Used': Decimal(100),
                'Source Depleted': False,
                'Comment': ''
            },
            {
                'Source Sample': source_sample_2,
                'Volume Used': Decimal(200),
                'Source Depleted': False,
                'Comment': '',
            }
        ]

        self.protocol_pooling = Protocol.objects.get(name="Sample Pooling")
        self.process_pooling = Process.objects.create(protocol=self.protocol_pooling)

        (source_pool, _, _) = pool_samples(process=self.process_pooling,
                                           samples_info=self.samples_to_pool_info,
                                           pool_name='PoolToCapture',
                                           container_destination=pool_container_3,
                                           coordinates_destination=None,
                                           execution_date=datetime.datetime(2020, 5, 21, 0, 0))

        update_qc_flags(source_sample_1, "Passed", "Passed")
        update_qc_flags(source_sample_2, "Passed", "Passed")
        update_qc_flags(source_pool, "Passed", "Passed")

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Test first source sample
        source_sample_1, _, _ = get_sample_from_container(barcode=self.source_sample_container_barcode_1)

        new_volume = self.source_sample_initial_volume - self.samples_to_pool_info[0]["Volume Used"] - self.library_1['volume_used']
        self.assertEqual(source_sample_1.volume, new_volume)
        self.assertTrue(source_sample_1.quantity_flag)
        self.assertTrue(source_sample_1.quality_flag)

        captured_library_1, _, _ = get_sample_from_container(barcode=self.library_1['library_destination_container_barcode'])

        self.assertEqual(captured_library_1.volume, self.library_1['library_volume'])
        self.assertEqual(captured_library_1.concentration, None)
        self.assertEqual(captured_library_1.quality_flag, None)
        self.assertEqual(captured_library_1.quantity_flag, None)

        # Library info tests
        for (derived_sample_source, derived_sample_converted) in zip(source_sample_1.derived_samples.all(),
                                                                     captured_library_1.derived_samples.all()):
            source_library = derived_sample_source.library
            captured_library = derived_sample_converted.library

            self.assertEqual(captured_library.library_selection, self.library_1['library_selection'])
            self.assertEqual(captured_library.platform, self.library_1['platform'])
            self.assertEqual(captured_library.library_type, source_library.library_type)
            self.assertEqual(captured_library.index, source_library.index)
            self.assertEqual(captured_library.strandedness, DOUBLE_STRANDED)

        # Process and process measurements tests
        pm_1 = ProcessMeasurement.objects.get(source_sample=source_sample_1,
                                              execution_date=self.library_1['date'],
                                              volume_used=self.library_1['volume_used'])
        self.assertEqual(pm_1.volume_used, self.library_1['volume_used'])
        self.assertEqual(pm_1.comment, self.library_1['library_comment'])
        self.assertEqual(pm_1.process.protocol.name, 'Library Capture')
        self.assertEqual(pm_1.process.comment, self.library_1['batch_comment'])

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Capture Technician Name', object_id=pm_1.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_1.process.id)

        pt_2 = PropertyType.objects.get(name='Library Kit Used', object_id=pm_1.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_1.process.id)

        pt_3 = PropertyType.objects.get(name='Library Kit Lot', object_id=pm_1.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_1.process.id)

        pt_4 = PropertyType.objects.get(name='Baits Used', object_id=pm_1.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_1.process.id)

        pt_5 = PropertyType.objects.get(name='Thermocycler Used', object_id=pm_1.process.protocol.id)
        p_5 = PropertyValue.objects.get(property_type_id=pt_5, object_id=pm_1.process.id)

        pt_6 = PropertyType.objects.get(name='PCR Cycles', object_id=pm_1.process.protocol.id)
        p_6 = PropertyValue.objects.get(property_type_id=pt_6, object_id=pm_1.process.id)

        pt_7 = PropertyType.objects.get(name='PCR Enzyme Used', object_id=pm_1.process.protocol.id)
        p_7 = PropertyValue.objects.get(property_type_id=pt_7, object_id=pm_1.process.id)

        pt_8 = PropertyType.objects.get(name='PCR Enzyme Lot', object_id=pm_1.process.protocol.id)
        p_8 = PropertyValue.objects.get(property_type_id=pt_8, object_id=pm_1.process.id)

        self.assertEqual(p_1.value, self.library_1['technician_name'])
        self.assertEqual(p_2.value, self.library_1['kit_used'])
        self.assertEqual(p_3.value, self.library_1['kit_lot'])
        self.assertEqual(p_4.value, self.library_1['baits_used'])
        self.assertEqual(p_5.value, self.library_1['thermocycler_used'])
        self.assertEqual(p_6.value, self.library_1['pcr_cycles'])
        self.assertEqual(p_7.value, self.library_1['pcr_enzyme'])
        self.assertEqual(p_8.value, self.library_1['pcr_enzyme_lot'])

        # Test second source sample
        source_sample_2, _, _ = get_sample_from_container(barcode=self.source_sample_container_barcode_2)

        new_volume = self.source_sample_initial_volume - self.samples_to_pool_info[1]["Volume Used"] - self.library_2['volume_used']
        self.assertEqual(source_sample_2.volume, new_volume)
        self.assertTrue(source_sample_2.quantity_flag)
        self.assertTrue(source_sample_2.quality_flag)

        captured_library_2, _, _ = get_sample_from_container(barcode=self.library_2['library_destination_container_barcode'])

        self.assertEqual(captured_library_2.volume, self.library_2['library_volume'])
        self.assertEqual(captured_library_2.concentration, None)
        self.assertEqual(captured_library_2.quality_flag, None)
        self.assertEqual(captured_library_2.quantity_flag, None)

        # Library info tests
        for (derived_sample_source, derived_sample_converted) in zip(source_sample_2.derived_samples.all(),
                                                                     captured_library_2.derived_samples.all()):
            source_library = derived_sample_source.library
            captured_library = derived_sample_converted.library

            self.assertEqual(captured_library.library_selection, self.library_2['library_selection'])
            self.assertEqual(captured_library.platform, self.library_2['platform'])
            self.assertEqual(captured_library.library_type, source_library.library_type)
            self.assertEqual(captured_library.index, source_library.index)
            self.assertEqual(captured_library.strandedness, DOUBLE_STRANDED)

        # Process and process measurements tests
        pm_2 = ProcessMeasurement.objects.get(source_sample=source_sample_2,
                                              execution_date=self.library_2['date'],
                                              volume_used=self.library_2['volume_used'])
        self.assertEqual(pm_2.volume_used, self.library_2['volume_used'])
        self.assertEqual(pm_2.comment, self.library_2['library_comment'])
        self.assertEqual(pm_2.process.protocol.name, 'Library Capture')
        self.assertEqual(pm_2.process.comment, self.library_2['batch_comment'])

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Capture Technician Name', object_id=pm_2.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_2.process.id)

        pt_2 = PropertyType.objects.get(name='Library Kit Used', object_id=pm_2.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_2.process.id)

        pt_3 = PropertyType.objects.get(name='Library Kit Lot', object_id=pm_2.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_2.process.id)

        pt_4 = PropertyType.objects.get(name='Baits Used', object_id=pm_2.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_2.process.id)

        pt_5 = PropertyType.objects.get(name='Thermocycler Used', object_id=pm_2.process.protocol.id)
        p_5 = PropertyValue.objects.get(property_type_id=pt_5, object_id=pm_2.process.id)

        pt_6 = PropertyType.objects.get(name='PCR Cycles', object_id=pm_2.process.protocol.id)
        p_6 = PropertyValue.objects.get(property_type_id=pt_6, object_id=pm_2.process.id)

        pt_7 = PropertyType.objects.get(name='PCR Enzyme Used', object_id=pm_2.process.protocol.id)
        p_7 = PropertyValue.objects.get(property_type_id=pt_7, object_id=pm_2.process.id)

        pt_8 = PropertyType.objects.get(name='PCR Enzyme Lot', object_id=pm_2.process.protocol.id)
        p_8 = PropertyValue.objects.get(property_type_id=pt_8, object_id=pm_2.process.id)

        self.assertEqual(p_1.value, self.library_2['technician_name'])
        self.assertEqual(p_2.value, self.library_2['kit_used'])
        self.assertEqual(p_3.value, self.library_2['kit_lot'])
        self.assertEqual(p_4.value, self.library_2['baits_used'])
        self.assertEqual(p_5.value, self.library_2['thermocycler_used'])
        self.assertEqual(p_6.value, self.library_2['pcr_cycles'])
        self.assertEqual(p_7.value, self.library_2['pcr_enzyme'])
        self.assertEqual(p_8.value, self.library_2['pcr_enzyme_lot'])

      # Test pooled source sample
        pooled_sample, _, _ = get_sample_from_container(barcode=self.source_pool_container_barcode_3)

        new_volume = self.samples_to_pool_info[0]["Volume Used"] + self.samples_to_pool_info[1]["Volume Used"] - self.pool_1['volume_used']
        self.assertEqual(pooled_sample.volume, new_volume)
        self.assertTrue(pooled_sample.quantity_flag)
        self.assertTrue(pooled_sample.quality_flag)

        captured_library_3, _, _ = get_sample_from_container(barcode=self.pool_1['library_destination_container_barcode'])

        self.assertEqual(captured_library_3.volume, self.pool_1['library_volume'])
        self.assertEqual(captured_library_3.concentration, None)
        self.assertEqual(captured_library_3.quality_flag, None)
        self.assertEqual(captured_library_3.quantity_flag, None)

        # Library info tests
        for (derived_sample_source, derived_sample_converted) in zip(pooled_sample.derived_samples.all(),
                                                                     captured_library_3.derived_samples.all()):
            source_library = derived_sample_source.library
            captured_library = derived_sample_converted.library

            self.assertEqual(captured_library.library_selection, self.pool_1['library_selection'])
            self.assertEqual(captured_library.platform, self.pool_1['platform'])
            self.assertEqual(captured_library.library_type, source_library.library_type)
            self.assertEqual(captured_library.index, source_library.index)
            self.assertEqual(captured_library.strandedness, DOUBLE_STRANDED)

        # Process and process measurements tests
        pm_3 = ProcessMeasurement.objects.get(source_sample=pooled_sample,
                                              execution_date=self.pool_1['date'],
                                              volume_used=self.pool_1['volume_used'])
        self.assertEqual(pm_3.volume_used, self.pool_1['volume_used'])
        self.assertEqual(pm_3.comment, self.pool_1['library_comment'])
        self.assertEqual(pm_3.process.protocol.name, 'Library Capture')
        self.assertEqual(pm_3.process.comment, self.pool_1['batch_comment'])

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Capture Technician Name', object_id=pm_3.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_3.process.id)

        pt_2 = PropertyType.objects.get(name='Library Kit Used', object_id=pm_3.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_3.process.id)

        pt_3 = PropertyType.objects.get(name='Library Kit Lot', object_id=pm_3.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_3.process.id)

        pt_4 = PropertyType.objects.get(name='Baits Used', object_id=pm_3.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_3.process.id)

        pt_5 = PropertyType.objects.get(name='Thermocycler Used', object_id=pm_3.process.protocol.id)
        p_5 = PropertyValue.objects.get(property_type_id=pt_5, object_id=pm_3.process.id)

        pt_6 = PropertyType.objects.get(name='PCR Cycles', object_id=pm_3.process.protocol.id)
        p_6 = PropertyValue.objects.get(property_type_id=pt_6, object_id=pm_3.process.id)

        pt_7 = PropertyType.objects.get(name='PCR Enzyme Used', object_id=pm_3.process.protocol.id)
        p_7 = PropertyValue.objects.get(property_type_id=pt_7, object_id=pm_3.process.id)

        pt_8 = PropertyType.objects.get(name='PCR Enzyme Lot', object_id=pm_3.process.protocol.id)
        p_8 = PropertyValue.objects.get(property_type_id=pt_8, object_id=pm_3.process.id)

        self.assertEqual(p_1.value, self.pool_1['technician_name'])
        self.assertEqual(p_2.value, self.pool_1['kit_used'])
        self.assertEqual(p_3.value, self.pool_1['kit_lot'])
        self.assertEqual(p_4.value, self.pool_1['baits_used'])
        self.assertEqual(p_5.value, self.pool_1['thermocycler_used'])
        self.assertEqual(p_6.value, self.pool_1['pcr_cycles'])
        self.assertEqual(p_7.value, self.pool_1['pcr_enzyme'])
        self.assertEqual(p_8.value, self.pool_1['pcr_enzyme_lot'])
