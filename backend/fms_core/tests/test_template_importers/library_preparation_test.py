from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime
import decimal

from fms_core.template_importer.importers import LibraryPreparationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import SampleKind, LibraryType, Platform, ProcessMeasurement, PropertyType, PropertyValue, Protocol, Process
from fms_core.models._constants import DOUBLE_STRANDED, SINGLE_STRANDED

from fms_core.services.container import create_container
from fms_core.services.sample import create_full_sample, get_sample_from_container, update_qc_flags, pool_samples
from fms_core.services.index import get_or_create_index_set, create_index


class LibraryPreparationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = LibraryPreparationImporter()
        self.file = APP_DATA_ROOT / "Library_preparation_v3_10_0.xlsx"
        ContentType.objects.clear_cache()

        self.source_sample_name = 'sample_source'
        self.source_sample_initial_volume = 100
        self.source_sample_container_barcode = 'SOURCECONTAINER4LIBRARYPREP'

        self.library_type_batch_1 = LibraryType.objects.get(name="PCR-free")
        self.library_type_batch_2 = LibraryType.objects.get(name="PCR-enriched")
        self.platform_batch_1 = Platform.objects.get(name="DNBSEQ")
        self.platform_batch_2 = Platform.objects.get(name="ILLUMINA")

        # Create indices
        (index_set, _, errors, warnings) = get_or_create_index_set(set_name="Illumina_TruSeq_DNA_RNA")
        (self.index_1, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqLT",
                                                        index_name="Index_1")
        (self.index_2, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqLT",
                                                        index_name="Index_2")
        (self.index_3, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqLT",
                                                        index_name="Index_3")
        (self.index_4, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqLT",
                                                        index_name="Index_4")

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
            thermocycler_used='Biometra Rouge',
            PCR_enzyme_used='KAPA HiFi HotStart Uracil+ Polymerase'
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

        self.library_4 = dict(
            **self.library_batch_2,
            library_container_barcode='Container4Library4',
            library_container_name='Container4Library4',
            library_container_kind='Tube',
            volume_used=10,
            library_volume=10,
            index=self.index_4,
            strandedness=DOUBLE_STRANDED,
            library_comment='Library 4 Comment'
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

        # Pool
        (container_pool, errors, warnings) = create_container(barcode='CONTAINER4SAMPLETOPOOL', kind='96-well plate',
                                                              name='Container4SampleToPool')

        sample_to_pool_1, errors, warnings = create_full_sample(name='SampleToPool1', volume=100, concentration=25,
                                                                collection_site='TestCaseSite',
                                                                creation_date=datetime.datetime(2022, 1, 1, 0, 0),
                                                                container=container_pool, coordinates='A01',
                                                                individual=None, sample_kind=sample_kind)

        sample_to_pool_2, errors, warnings = create_full_sample(name='SampleToPool2', volume=100, concentration=25,
                                                                collection_site='TestCaseSite',
                                                                creation_date=datetime.datetime(2022, 1, 1, 0, 0),
                                                                container=container_pool, coordinates='A02',
                                                                individual=None, sample_kind=sample_kind)

        # Create objects for the pooling test
        samples_to_pool_info = [
            {
                'Source Sample': sample_to_pool_1,
                'Volume Used': decimal.Decimal(20.0),
                'Source Depleted': False,
                'Comment': ''
            },
            {
                'Source Sample': sample_to_pool_2,
                'Volume Used': decimal.Decimal(20.5),
                'Source Depleted': False,
                'Comment': '',
            }
        ]

        (container_pool, errors, warnings) = create_container(barcode="PoolContainerSourceLibraryPrep",
                                                              kind='Tube',
                                                              name="PoolContainerSourceLibraryPrep")

        self.protocol_pooling = Protocol.objects.get(name="Sample Pooling")
        self.process_pooling = Process.objects.create(protocol=self.protocol_pooling)

        (self.pool, errors, warnings) = pool_samples(process=self.process_pooling,
                                                     samples_info=samples_to_pool_info,
                                                     pool_name='PoolForLibraryPrep',
                                                     container_destination=container_pool,
                                                     coordinates_destination=None,
                                                     execution_date=datetime.datetime(2020, 5, 21, 0, 0))

        update_qc_flags(self.pool, "Passed", "Passed")


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        print(result['base_errors'])
        self.assertEqual(result['valid'], True)

        # Test source sample
        source_sample, _, _ = get_sample_from_container(barcode=self.source_sample_container_barcode)
        new_volume = self.source_sample_initial_volume - self.library_1['volume_used'] - self.library_2['volume_used'] - self.library_3['volume_used']
        self.assertEqual(source_sample.volume, new_volume)
        self.assertEqual(source_sample.quantity_flag, True)
        self.assertEqual(source_sample.quality_flag, True)

        # Test first library
        sample_library_1, _, _ = get_sample_from_container(barcode='Container4Library1')

        self.assertEqual(sample_library_1.volume, self.library_1['library_volume'])
        self.assertEqual(sample_library_1.concentration, None)
        self.assertEqual(sample_library_1.quality_flag, None)
        self.assertEqual(sample_library_1.quantity_flag, None)

        for derived_sample in sample_library_1.derived_samples.all():
            library = derived_sample.library

            # Library info tests
            self.assertEqual(library.library_type, self.library_1['library_type'])
            self.assertEqual(library.platform, self.library_1['platform'])
            self.assertEqual(library.index, self.library_1['index'])
            self.assertEqual(library.strandedness, self.library_1['strandedness'])

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

        pt_5 = PropertyType.objects.get(name='Thermocycler Used', object_id=pm_1.process.protocol.id)
        p_5 = PropertyValue.objects.get(property_type_id=pt_5, object_id=pm_1.process.id)

        pt_6 = PropertyType.objects.get(name='PCR Enzyme Used', object_id=pm_1.process.protocol.id)
        p_6 = PropertyValue.objects.get(property_type_id=pt_6, object_id=pm_1.process.id)

        self.assertEqual(p_1.value, self.library_1['library_technician_name'])
        self.assertEqual(p_2.value, self.library_1['library_kit_used'])
        self.assertEqual(p_3.value, self.library_1['library_kit_lot'])
        self.assertEqual(p_4.value, self.library_1['shearing_technician_name'])
        self.assertEqual(p_5.value, self.library_1['thermocycler_used'])
        self.assertEqual(p_6.value, self.library_1['PCR_enzyme_used'])

        # Test second library
        sample_library_2, _, _ = get_sample_from_container(barcode='Container4Library2')

        self.assertEqual(sample_library_2.volume, self.library_2['library_volume'])
        self.assertEqual(sample_library_2.concentration, None)
        self.assertEqual(sample_library_2.quality_flag, None)
        self.assertEqual(sample_library_2.quantity_flag, None)

        for derived_sample in sample_library_2.derived_samples.all():
            library = derived_sample.library

            # Library info tests
            self.assertEqual(library.library_type, self.library_2['library_type'])
            self.assertEqual(library.platform, self.library_2['platform'])
            self.assertEqual(library.index, self.library_2['index'])
            self.assertEqual(library.strandedness, self.library_2['strandedness'])

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

        self.assertEqual(sample_library_3.volume, self.library_3['library_volume'])
        self.assertEqual(sample_library_3.concentration, None)
        self.assertEqual(sample_library_3.quality_flag, None)
        self.assertEqual(sample_library_3.quantity_flag, None)

        for derived_sample in sample_library_3.derived_samples.all():
            library = derived_sample.library

            # Library info tests
            self.assertEqual(library.library_type, self.library_3['library_type'])
            self.assertEqual(library.platform, self.library_3['platform'])
            self.assertEqual(library.index, self.library_3['index'])
            self.assertEqual(library.strandedness, self.library_3['strandedness'])

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

        # Test fourth library (pool of samples -> pool of libraries)
        sample_library_4, _, _ = get_sample_from_container(barcode='Container4Library4')
        for derived_sample in sample_library_4.derived_samples.all():
            library = derived_sample.library
            self.assertEqual(sample_library_4.volume, self.library_4['library_volume'])
            self.assertEqual(sample_library_4.concentration, None)
            self.assertEqual(sample_library_4.quality_flag, None)
            self.assertEqual(sample_library_4.quantity_flag, None)

            # Library info tests
            self.assertEqual(library.library_type, self.library_4['library_type'])
            self.assertEqual(library.platform, self.library_4['platform'])
            self.assertEqual(library.index, self.library_4['index'])
            self.assertEqual(library.strandedness, self.library_4['strandedness'])

        # Process and process measurements tests
        pm_4 = ProcessMeasurement.objects.get(source_sample=self.pool,
                                              execution_date=self.library_4['date'],
                                              volume_used=self.library_4['volume_used'])
        self.assertEqual(pm_4.volume_used, self.library_4['volume_used'])
        self.assertEqual(pm_4.comment, self.library_4['library_comment'])
        self.assertEqual(pm_4.process.protocol.name, 'Library Preparation')
        self.assertEqual(pm_4.process.comment, self.library_4['batch_comment'])

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Library Technician Name', object_id=pm_4.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm_4.process.id)

        pt_2 = PropertyType.objects.get(name='Library Kit Used', object_id=pm_4.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm_4.process.id)

        pt_3 = PropertyType.objects.get(name='Library Kit Lot', object_id=pm_4.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm_4.process.id)

        pt_4 = PropertyType.objects.get(name='Shearing Technician Name', object_id=pm_4.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm_4.process.id)

        self.assertEqual(p_1.value, self.library_4['library_technician_name'])
        self.assertEqual(p_2.value, self.library_4['library_kit_used'])
        self.assertEqual(p_3.value, self.library_4['library_kit_lot'])
        self.assertEqual(p_4.value, ' ')


