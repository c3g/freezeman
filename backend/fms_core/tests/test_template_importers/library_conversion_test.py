from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime
from decimal import Decimal

from fms_core.template_importer.importers import LibraryConversionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import SampleKind, ProcessMeasurement, PropertyType, PropertyValue, Protocol, Process
from fms_core.models._constants import DOUBLE_STRANDED, SINGLE_STRANDED

from fms_core.services.container import create_container
from fms_core.services.sample import create_full_sample, get_sample_from_container, update_qc_flags, pool_samples
from fms_core.services.library import create_library, get_library_type
from fms_core.services.platform import get_platform
from fms_core.services.index import get_or_create_index_set, create_index


class LibraryConversionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = LibraryConversionImporter()
        self.file = APP_DATA_ROOT / "Library_conversion_v4_1_0.xlsx"
        ContentType.objects.clear_cache()

        self.source_sample_name_1 = 'sample_source_1'
        self.source_sample_name_2 = 'sample_source_2'
        self.source_sample_initial_volume = 100
        self.source_pool_initial_volume = 10
        self.source_sample_container_barcode_1 = 'SOURCECONTAINER4LIBRARYCONVERSION1'
        self.source_sample_container_barcode_2 = 'SOURCECONTAINER4LIBRARYCONVERSION2'
        self.source_pool_container_barcode_3 = 'SOURCECONTAINER4LIBRARYPOOLCONVERSION'

        self.platform_illumina, errors, warnings = get_platform(name="ILLUMINA")
        self.platform_mgi, errors, warnings = get_platform(name="DNBSEQ")
        self.library_type, errors, warnings = get_library_type(name="PCR-free")

        self.library_batch_1 = dict(
            ID='batch_1',
            date='2022-05-16',
            platform=self.platform_mgi,
            batch_comment='Comment batch 1',
            technician_name='Janick St-Cyr',
            kit_used='MGI_Conversion_AppA',
            kit_lot='1',
            thermocycler_used='Eppendorf 1 Pre-PCR',
        )

        self.library_batch_2 = dict(
            ID='batch_2',
            date='2022-05-17',
            platform=self.platform_mgi,
            batch_comment='Comment batch 2',
            technician_name='Tony Tir',
            kit_used='MGI_Conversion_AppB',
            kit_lot='2',
        )

        self.library_1 = dict(
            **self.library_batch_1,
            library_source_container_barcode=self.source_sample_container_barcode_1,
            library_source_container_name='Container4LibraryConversion1',
            library_source_container_kind='Tube',
            library_destination_container_barcode='Container4LibraryDest1',
            library_destination_container_coord='A01',
            library_destination_container_name='Container4LibraryDest1',
            library_destination_container_kind='Tube',
            volume_used=2,
            library_volume=5,
            library_size=15,
            library_comment='Library conversion comment 1'
        )

        self.library_2 = dict(
            **self.library_batch_1,
            library_source_container_barcode=self.source_sample_container_barcode_1,
            library_source_container_name='Container4LibraryConversion1',
            library_source_container_kind='Tube',
            library_destination_container_barcode='Container4LibraryDest2',
            library_destination_container_coord='A02',
            library_destination_container_name='Container4LibraryDest2',
            library_destination_container_kind='Tube',
            volume_used=4,
            library_volume=10,
            library_size=15,
            library_comment='Library conversion comment 2'
        )

        self.library_3 = dict(
            **self.library_batch_2,
            library_source_container_barcode=self.source_sample_container_barcode_2,
            library_source_container_name='Container4LibraryConversion2',
            library_source_container_kind='Tube',
            library_destination_container_barcode='Container4LibraryDest3',
            library_destination_container_coord='A03',
            library_destination_container_name='Container4LibraryDest3',
            library_destination_container_kind='Tube',
            volume_used=5,
            library_volume=15,
            library_size=15,
            library_comment='Library conversion comment 3'
        )

        self.library_4 = dict(
            **self.library_batch_2,
            library_source_container_barcode=self.source_pool_container_barcode_3,
            library_source_container_name='Container4LibraryPoolConversion',
            library_source_container_kind='Tube',
            library_destination_container_barcode='Container4LibraryDest4',
            library_destination_container_coord='A04',
            library_destination_container_name='Container4LibraryDest4',
            library_destination_container_kind='Tube',
            volume_used=5,
            library_volume=5,
            library_size=10,
            library_comment='Library conversion comment 4'
        )

        self.prefill_data()

    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')

        (container_1, errors, warnings) = create_container(barcode=self.source_sample_container_barcode_1,
                                                           kind='Tube',
                                                           name='Container4LibraryConversion1')

        (container_2, errors, warnings) = create_container(barcode=self.source_sample_container_barcode_2,
                                                           kind='Tube',
                                                           name='Container4LibraryConversion2')

        (container_3, errors, warnings) = create_container(barcode='Container4LibraryToPool1',
                                                           kind='Tube',
                                                           name='Container4LibraryToPool1')

        (container_4, errors, warnings) = create_container(barcode='Container4LibraryToPool2',
                                                           kind='Tube',
                                                           name='Container4LibraryToPool2')

        (container_pool, errors, warnings) = create_container(barcode=self.source_pool_container_barcode_3,
                                                              kind='Tube',
                                                              name='Container4LibraryPoolConversion')

        # Create indices
        (index_set, _, errors, warnings) = get_or_create_index_set(set_name="IDT_10nt_UDI_TruSeq_Adapter")
        (index_1, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                                   index_name="IDT_10nt_UDI_i7_001-IDT_10nt_UDI_i5_001")
        (index_2, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                                   index_name="IDT_10nt_UDI_i7_002-IDT_10nt_UDI_i5_002")
        (index_3, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                                   index_name="IDT_10nt_UDI_i7_002-IDT_10nt_UDI_i5_003")
        (index_4, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                                   index_name="IDT_10nt_UDI_i7_002-IDT_10nt_UDI_i5_004")

        (library_1, errors, warnings) = create_library(index=index_1,
                                                       library_type=self.library_type,
                                                       platform=self.platform_illumina,
                                                       strandedness=DOUBLE_STRANDED)

        (library_2, errors, warnings) = create_library(index=index_2,
                                                       library_type=self.library_type,
                                                       platform=self.platform_illumina,
                                                       strandedness=DOUBLE_STRANDED)

        (library_to_pool_1, errors, warnings) = create_library(index=index_3,
                                                               library_type=self.library_type,
                                                               platform=self.platform_illumina,
                                                               strandedness=DOUBLE_STRANDED)

        (library_to_pool_2, errors, warnings) = create_library(index=index_4,
                                                               library_type=self.library_type,
                                                               platform=self.platform_illumina,
                                                               strandedness=DOUBLE_STRANDED)


        (source_sample_1, errors, warnings) = \
            create_full_sample(name=self.source_sample_name_1, volume=self.source_sample_initial_volume, concentration=20,
                               collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                               container=container_1, sample_kind=sample_kind, library=library_1, fragment_size=self.library_1["library_size"])

        (source_sample_2, errors, warnings) = \
            create_full_sample(name=self.source_sample_name_2, volume=self.source_sample_initial_volume, concentration=25,
                               collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                               container=container_2, sample_kind=sample_kind, library=library_2, fragment_size=self.library_2["library_size"])

        (source_sample_to_pool_1, errors, warnings) = \
            create_full_sample(name="LibraryToPool1", volume=self.source_sample_initial_volume,
                               concentration=25,
                               collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                               container=container_3, sample_kind=sample_kind, library=library_to_pool_1, fragment_size=self.library_3["library_size"])

        (source_sample_to_pool_2, errors, warnings) = \
            create_full_sample(name="LibraryToPool2", volume=self.source_sample_initial_volume,
                               concentration=25,
                               collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                               container=container_4, sample_kind=sample_kind, library=library_to_pool_2, fragment_size=self.library_4["library_size"])

        # Create objects for the pooling test
        samples_to_pool_info = [
            {
                'Source Sample': source_sample_to_pool_1,
                'Volume Used': Decimal(5.5),
                'Volume In Pool': Decimal(5.5),
                'Source Depleted': False,
                'Comment': ''
            },
            {
                'Source Sample': source_sample_to_pool_2,
                'Volume Used': Decimal(4.5),
                'Volume In Pool': Decimal(4.5),
                'Source Depleted': False,
                'Comment': '',
            }
        ]

        self.protocol_pooling = Protocol.objects.get(name="Sample Pooling")
        self.process_pooling = Process.objects.create(protocol=self.protocol_pooling)

        (source_pool, errors, warnings) = pool_samples(process=self.process_pooling,
                                                       samples_info=samples_to_pool_info,
                                                       pool_name='PoolToConvert',
                                                       container_destination=container_pool,
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

        new_volume = self.source_sample_initial_volume - self.library_1['volume_used'] - self.library_2['volume_used']
        self.assertEqual(source_sample_1.volume, new_volume)
        self.assertEqual(source_sample_1.quantity_flag, True)
        self.assertEqual(source_sample_1.quality_flag, True)

        converted_library_1, _, _ = get_sample_from_container(barcode='Container4LibraryDest1')

        self.assertEqual(converted_library_1.volume, self.library_1['library_volume'])
        self.assertIsNone(converted_library_1.fragment_size)
        self.assertIsNone(converted_library_1.concentration)
        self.assertIsNone(converted_library_1.quality_flag)
        self.assertIsNone(converted_library_1.quantity_flag)

        # Library info tests
        for (derived_sample_source, derived_sample_converted) in zip(source_sample_1.derived_samples.all(),
                                                                     converted_library_1.derived_samples.all()):
            source_library = derived_sample_source.library
            converted_library = derived_sample_converted.library

            self.assertEqual(converted_library.platform, self.library_1['platform'])
            self.assertEqual(converted_library.library_type, source_library.library_type)
            self.assertEqual(converted_library.index, source_library.index)
            self.assertEqual(converted_library.strandedness, SINGLE_STRANDED)

        # Process and process measurements tests
        pm_1 = ProcessMeasurement.objects.get(source_sample=source_sample_1,
                                              execution_date=self.library_1['date'],
                                              volume_used=self.library_1['volume_used'])
        self.assertEqual(pm_1.volume_used, self.library_1['volume_used'])
        self.assertEqual(pm_1.comment, self.library_1['library_comment'])
        self.assertEqual(pm_1.process.protocol.name, 'Library Conversion')
        self.assertEqual(pm_1.process.comment, self.library_1['batch_comment'])

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Technician Name', object_id=pm_1.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_1.process.id)

        pt_2 = PropertyType.objects.get(name='Kit Used', object_id=pm_1.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_1.process.id)

        pt_3 = PropertyType.objects.get(name='Kit Lot', object_id=pm_1.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_1.process.id)

        pt_4 = PropertyType.objects.get(name='Thermocycler Used', object_id=pm_1.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_1.process.id)

        self.assertEqual(p_1.value, self.library_1['technician_name'])
        self.assertEqual(p_2.value, self.library_1['kit_used'])
        self.assertEqual(p_3.value, self.library_1['kit_lot'])
        self.assertEqual(p_4.value, self.library_1['thermocycler_used'])

        # Test second library conversion
        converted_library_2, _, _ = get_sample_from_container(barcode='Container4LibraryDest2')

        self.assertEqual(converted_library_2.volume, self.library_2['library_volume'])
        self.assertIsNone(converted_library_2.fragment_size)
        self.assertIsNone(converted_library_2.concentration)
        self.assertIsNone(converted_library_2.quality_flag)
        self.assertIsNone(converted_library_2.quantity_flag)

        # Library info tests
        for (derived_sample_source, derived_sample_converted) in zip(source_sample_1.derived_samples.all(),
                                                                     converted_library_2.derived_samples.all()):
            source_library = derived_sample_source.library
            converted_library = derived_sample_converted.library

            self.assertEqual(converted_library.platform, self.library_2['platform'])
            self.assertEqual(converted_library.library_type, source_library.library_type)
            self.assertEqual(converted_library.index, source_library.index)
            self.assertEqual(converted_library.strandedness, SINGLE_STRANDED)

        # Process and process measurements tests
        pm_2 = ProcessMeasurement.objects.get(source_sample=source_sample_1,
                                              execution_date=self.library_2['date'],
                                              volume_used=self.library_2['volume_used'])
        self.assertEqual(pm_2.volume_used, self.library_2['volume_used'])
        self.assertEqual(pm_2.comment, self.library_2['library_comment'])
        self.assertEqual(pm_2.process.protocol.name, 'Library Conversion')
        self.assertEqual(pm_2.process.comment, self.library_2['batch_comment'])

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Technician Name', object_id=pm_2.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_2.process.id)

        pt_2 = PropertyType.objects.get(name='Kit Used', object_id=pm_2.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_2.process.id)

        pt_3 = PropertyType.objects.get(name='Kit Lot', object_id=pm_2.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_2.process.id)

        pt_4 = PropertyType.objects.get(name='Thermocycler Used', object_id=pm_2.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_2.process.id)

        self.assertEqual(p_1.value, self.library_2['technician_name'])
        self.assertEqual(p_2.value, self.library_2['kit_used'])
        self.assertEqual(p_3.value, self.library_2['kit_lot'])
        self.assertEqual(p_4.value, self.library_2['thermocycler_used'])

        # Test second source sample
        source_sample_2, _, _ = get_sample_from_container(barcode=self.source_sample_container_barcode_2)

        new_volume = self.source_sample_initial_volume - self.library_3['volume_used']
        self.assertEqual(source_sample_2.volume, new_volume)
        self.assertEqual(source_sample_2.quantity_flag, True)
        self.assertEqual(source_sample_2.quality_flag, True)

        # Test third library conversion
        converted_library_3, _, _ = get_sample_from_container(barcode='Container4LibraryDest3')

        self.assertEqual(converted_library_3.volume, self.library_3['library_volume'])
        self.assertIsNone(converted_library_3.fragment_size)
        self.assertIsNone(converted_library_3.concentration)
        self.assertIsNone(converted_library_3.quality_flag)
        self.assertIsNone(converted_library_3.quantity_flag)

        # Library info tests
        for (derived_sample_source, derived_sample_converted) in zip(source_sample_2.derived_samples.all(),
                                                                     converted_library_3.derived_samples.all()):
            source_library = derived_sample_source.library
            converted_library = derived_sample_converted.library

            self.assertEqual(converted_library.platform, self.library_3['platform'])
            self.assertEqual(converted_library.library_type, source_library.library_type)
            self.assertEqual(converted_library.index, source_library.index)
            self.assertEqual(converted_library.strandedness, SINGLE_STRANDED)

        # Process and process measurements tests
        pm_3 = ProcessMeasurement.objects.get(source_sample=source_sample_2,
                                              execution_date=self.library_3['date'],
                                              volume_used=self.library_3['volume_used'])
        self.assertEqual(pm_3.volume_used, self.library_3['volume_used'])
        self.assertEqual(pm_3.comment, self.library_3['library_comment'])
        self.assertEqual(pm_3.process.protocol.name, 'Library Conversion')
        self.assertEqual(pm_3.process.comment, self.library_3['batch_comment'])

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Technician Name', object_id=pm_3.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_3.process.id)

        pt_2 = PropertyType.objects.get(name='Kit Used', object_id=pm_3.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_3.process.id)

        pt_3 = PropertyType.objects.get(name='Kit Lot', object_id=pm_3.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_3.process.id)

        pt_4 = PropertyType.objects.get(name='Thermocycler Used', object_id=pm_3.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_3.process.id)

        self.assertEqual(p_1.value, self.library_3['technician_name'])
        self.assertEqual(p_2.value, self.library_3['kit_used'])
        self.assertEqual(p_3.value, self.library_3['kit_lot'])
        self.assertEqual(p_4.value, ' ')

        # Test third source sample (pool)
        source_sample_pool, _, _ = get_sample_from_container(barcode=self.source_pool_container_barcode_3)

        new_volume = self.source_pool_initial_volume - self.library_4['volume_used']
        self.assertEqual(source_sample_pool.volume, new_volume)
        self.assertEqual(source_sample_pool.quantity_flag, True)
        self.assertEqual(source_sample_pool.quality_flag, True)

        # Test fourth library conversion (pool of libraries converted)
        converted_libraries_4, _, _ = get_sample_from_container(barcode='Container4LibraryDest4')

        self.assertEqual(converted_libraries_4.volume, self.library_4['library_volume'])
        self.assertIsNone(converted_libraries_4.fragment_size)
        self.assertIsNone(converted_libraries_4.concentration)
        self.assertIsNone(converted_libraries_4.quality_flag)
        self.assertIsNone(converted_libraries_4.quantity_flag)

        # Library info tests
        for (derived_sample_source, derived_sample_converted) in zip(source_sample_pool.derived_samples.all(),
                                                                     converted_libraries_4.derived_samples.all()):
            source_library_pool = derived_sample_source.library
            converted_library_pool = derived_sample_converted.library

            self.assertEqual(converted_library_pool.platform, self.library_4['platform'])
            self.assertEqual(converted_library_pool.library_type, source_library_pool.library_type)
            self.assertEqual(converted_library_pool.index, source_library_pool.index)
            self.assertEqual(converted_library_pool.strandedness, SINGLE_STRANDED)

        # Process and process measurements tests
        pm_4 = ProcessMeasurement.objects.get(source_sample=source_sample_pool,
                                              execution_date=self.library_4['date'],
                                              volume_used=self.library_4['volume_used'])
        self.assertEqual(pm_4.volume_used, self.library_4['volume_used'])
        self.assertEqual(pm_4.comment, self.library_4['library_comment'])
        self.assertEqual(pm_4.process.protocol.name, 'Library Conversion')
        self.assertEqual(pm_4.process.comment, self.library_4['batch_comment'])

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Technician Name', object_id=pm_4.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_4.process.id)

        pt_2 = PropertyType.objects.get(name='Kit Used', object_id=pm_4.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_4.process.id)

        pt_3 = PropertyType.objects.get(name='Kit Lot', object_id=pm_4.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_4.process.id)

        pt_4 = PropertyType.objects.get(name='Thermocycler Used', object_id=pm_4.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_4.process.id)

        self.assertEqual(p_1.value, self.library_4['technician_name'])
        self.assertEqual(p_2.value, self.library_4['kit_used'])
        self.assertEqual(p_3.value, self.library_4['kit_lot'])
        self.assertEqual(p_4.value, ' ')