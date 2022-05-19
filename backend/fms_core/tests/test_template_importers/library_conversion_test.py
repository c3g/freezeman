from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import LibraryConversionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import SampleKind, ProcessMeasurement, PropertyType, PropertyValue
from fms_core.models._constants import DOUBLE_STRANDED, SINGLE_STRANDED

from fms_core.services.container import create_container
from fms_core.services.sample import create_full_sample, get_sample_from_container, update_qc_flags
from fms_core.services.library import create_library, get_library_type
from fms_core.services.platform import get_platform
from fms_core.services.index import get_index


class LibraryConversionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = LibraryConversionImporter()
        self.file = APP_DATA_ROOT / "Library_conversion_v3_9_0.xlsx"
        ContentType.objects.clear_cache()

        self.source_sample_name_1 = 'sample_source_1'
        self.source_sample_name_2 = 'sample_source_2'
        self.source_sample_initial_volume = 100
        self.source_sample_container_barcode_1 = 'SOURCECONTAINER4LIBRARYCONVERSION1'
        self.source_sample_container_barcode_2 = 'SOURCECONTAINER4LIBRARYCONVERSION2'

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
            thermocycler_used='Biometra Rouge',
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

        self.prefill_data()

    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')

        (container_1, errors, warnings) = create_container(barcode=self.source_sample_container_barcode_1,
                                                           kind='Tube',
                                                           name='Container4LibraryConversion1')

        (container_2, errors, warnings) = create_container(barcode=self.source_sample_container_barcode_2,
                                                           kind='Tube',
                                                           name='Container4LibraryConversion2')

        (index_1, errors, warnings) = get_index(name="IDT_10nt_UDI_i7_001-IDT_10nt_UDI_i5_001")

        (index_2, errors, warnings) = get_index(name="IDT_10nt_UDI_i7_002-IDT_10nt_UDI_i5_002")

        (library_1, errors, warnings) = create_library(index=index_1,
                                                       library_type=self.library_type,
                                                       platform=self.platform_illumina,
                                                       strandedness=DOUBLE_STRANDED)

        (library_2, errors, warnings) = create_library(index=index_2,
                                                       library_type=self.library_type,
                                                       platform=self.platform_illumina,
                                                       strandedness=DOUBLE_STRANDED)


        (source_sample_1, errors, warnings) = \
            create_full_sample(name=self.source_sample_name_1, volume=self.source_sample_initial_volume, concentration=20,
                               collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                               container=container_1, sample_kind=sample_kind, library=library_1)

        (source_sample_2, errors, warnings) = \
            create_full_sample(name=self.source_sample_name_2, volume=self.source_sample_initial_volume, concentration=25,
                               collection_site='TestCaseSite', creation_date=datetime.datetime(2022, 1, 15, 0, 0),
                               container=container_2, sample_kind=sample_kind, library=library_2)

        update_qc_flags(source_sample_1, "Passed", "Passed")
        update_qc_flags(source_sample_2, "Passed", "Passed")

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Test source sample
        source_sample_1, _, _ = get_sample_from_container(barcode=self.source_sample_container_barcode_1)
        source_library_1 = source_sample_1.derived_sample_not_pool.library

        source_sample_2, _, _ = get_sample_from_container(barcode=self.source_sample_container_barcode_2)
        source_library_2 = source_sample_2.derived_sample_not_pool.library

        new_volume = self.source_sample_initial_volume - self.library_1['volume_used'] - self.library_2['volume_used']
        self.assertEqual(source_sample_1.volume, new_volume)
        self.assertEqual(source_sample_1.quantity_flag, True)
        self.assertEqual(source_sample_1.quality_flag, True)

        # Test first library conversion
        sample_library_1, _, _ = get_sample_from_container(barcode='Container4LibraryDest1')
        library_1 = sample_library_1.derived_sample_not_pool.library

        self.assertEqual(sample_library_1.volume, self.library_1['library_volume'])
        self.assertEqual(sample_library_1.quality_flag, None)
        self.assertEqual(sample_library_1.quantity_flag, None)

        # Library info tests
        self.assertEqual(library_1.platform, self.library_1['platform'])
        self.assertEqual(library_1.library_type, source_library_1.library_type)
        self.assertEqual(library_1.index, source_library_1.index)
        self.assertEqual(library_1.strandedness, SINGLE_STRANDED)

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