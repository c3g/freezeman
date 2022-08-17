from django.test import TestCase
from datetime import datetime
from decimal import Decimal

from fms_core.template_importer.importers import NormalizationPlanningImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models._constants import DOUBLE_STRANDED, DSDNA_MW

from fms_core.models import Sample, SampleKind, ProcessMeasurement, SampleLineage, PropertyType, PropertyValue

from fms_core.services.container import get_or_create_container, create_container, get_container
from fms_core.services.sample import create_full_sample
from fms_core.services.platform import get_platform
from fms_core.services.library import get_library_type, create_library
from fms_core.services.index import get_or_create_index_set, create_index

from fms_core.utils import convert_concentration_from_nm_to_ngbyul

class NormalizationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = NormalizationPlanningImporter()
        self.file = APP_DATA_ROOT / "Normalization_planning_v3_11_0.xlsx"

        self.prefill_data()


    def prefill_data(self):
        sample_kind_DNA, _ = SampleKind.objects.get_or_create(name='DNA')

        platform_illumina, errors, warnings = get_platform(name="ILLUMINA")
        library_type, errors, warnings = get_library_type(name="PCR-free")

        # Create indices
        (index_set, _, errors, warnings) = get_or_create_index_set(set_name="IDT_10nt_UDI_TruSeq_Adapter")
        (index_1, errors, warnings) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                                      index_name="IDT_10nt_UDI_i7_001-IDT_10nt_UDI_i5_001")
        (library_1, errors, warnings) = create_library(index=index_1,
                                                       library_type=library_type,
                                                       platform=platform_illumina,
                                                       strandedness=DOUBLE_STRANDED,
                                                       library_size=150)

        containers_info = [
            {'barcode': 'PARENT_RACK_NORM', 'name': 'PARENT_RACK_NORM', 'kind': 'tube rack 8x12', 'location': None, 'coordinates': '',},
            {'barcode': 'SRC_PLATE_NORM', 'name': 'SRC_PLATE_NORM', 'kind': '96-well plate', 'location': None, 'coordinates': '',},
            {'barcode': 'DST_PLATE_NORM', 'name': 'DST_PLATE_NORM', 'kind': '96-well plate', 'location': None, 'coordinates': '',},
            {'barcode': 'SRC_TUBE_NORM_1', 'name': 'SRC_TUBE_NORM_1', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'A01',},
            {'barcode': 'SRC_TUBE_NORM_2', 'name': 'SRC_TUBE_NORM_2', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'B01',},
            {'barcode': 'SRC_TUBE_NORM_3', 'name': 'SRC_TUBE_NORM_3', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'C01',},
        ]

        samples_info = [
            {'name': 'Sample1NormPlanning', 'volume': 100, 'conc.': 25, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A01', 'library': None},
            {'name': 'Sample2NormPlanning', 'volume': 100, 'conc.': 50, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A02', 'library': None},
            {'name': 'Sample3NormPlanning', 'volume': 100, 'conc.': 10, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'B01', 'library': None},
            {'name': 'Sample4NormPlanning', 'volume': 100, 'conc.': 20, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A01', 'library': library_1},
            {'name': 'Sample5NormPlanning', 'volume': 100, 'conc.': 40, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A02', 'library': library_1},
            {'name': 'Sample6NormPlanning', 'volume': 100, 'conc.': 80, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A03', 'library': library_1},
            {'name': 'Sample7NormPlanning', 'volume': 100, 'conc.': 25, 'container_barcode': 'SRC_TUBE_NORM_1', 'coordinates': '', 'library': None},
            {'name': 'Sample8NormPlanning', 'volume': 100, 'conc.': 50, 'container_barcode': 'SRC_TUBE_NORM_2', 'coordinates': '', 'library': None},
            {'name': 'Sample9NormPlanning', 'volume': 100, 'conc.': 10, 'container_barcode': 'SRC_TUBE_NORM_3', 'coordinates': '', 'library': None},
        ]

        for info in containers_info:
            location = get_container(barcode=info['location']) if info['location'] is not None else None
            create_container(barcode=info['barcode'], name=info['name'], kind=info['kind'], location=location, coordinates=info['coordinates'])

        for info in samples_info:
            (container, _, errors, warnings) = get_container(barcode=info['container_barcode'])

            (sample, errors, warnings) = create_full_sample(name=info['name'],
                                                            volume=info['volume'],
                                                            concentration=info['conc.'],
                                                            collection_site='site1',
                                                            creation_date=datetime(2022, 7, 5, 0, 0),
                                                            container=container, coordinates=info['coordinates'],
                                                            sample_kind=sample_kind_DNA,
                                                            library=info['library'])

            


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)

        self.assertEqual(result['valid'], True)

        # Source sample 1 tests
        ss1 = Sample.objects.get(container__barcode="SOURCE_CONTAINER", coordinates="A01")
        self.assertEqual(ss1.volume, 25)
        self.assertFalse(ss1.depleted)

        # Source sample 2 tests
        ss2 = Sample.objects.get(container__barcode="SOURCE_CONTAINER", coordinates="A02")
        self.assertEqual(ss2.volume, 25)
        self.assertFalse(ss2.depleted)

        # Source sample 3 tests
        ss3 = Sample.objects.get(container__barcode="SOURCE_CONTAINER", coordinates="A03")
        self.assertEqual(ss3.volume, 25)
        self.assertTrue(ss3.depleted)

        # Destination sample 1 test
        self.assertTrue(Sample.objects.filter(container__barcode="DESTINATION_CONTAINER", coordinates="A01").exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss1).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss1).exists())

        cs1 = Sample.objects.get(container__barcode="DESTINATION_CONTAINER", coordinates="A01")
        sl1 = SampleLineage.objects.get(parent=ss1)
        pm1 = ProcessMeasurement.objects.get(source_sample=ss1)

        self.assertEqual(sl1.child, cs1)
        self.assertEqual(sl1.process_measurement, pm1)
        self.assertEqual(pm1.source_sample, ss1)
        self.assertEqual(pm1.volume_used, 5)
        self.assertEqual(pm1.protocol_name, "Normalization")
        self.assertEqual(pm1.comment, "Comment1")
        self.assertEqual(cs1.volume, 4)
        self.assertEqual(cs1.creation_date, pm1.execution_date)
        self.assertEqual(cs1.creation_date, datetime.strptime("2022-07-05", "%Y-%m-%d").date())

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Final Volume', object_id=pm1.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm1.id)

        pt_2 = PropertyType.objects.get(name='Final Concentration', object_id=pm1.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm1.id)

        self.assertEqual(p_1.value, '4.000')
        self.assertEqual(p_2.value, '12.500')

        # Destination sample 2 test
        self.assertTrue(Sample.objects.filter(container__barcode="DESTINATION_CONTAINER", coordinates="A02").exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss2).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss2).exists())

        cs2 = Sample.objects.get(container__barcode="DESTINATION_CONTAINER", coordinates="A02")
        sl2 = SampleLineage.objects.get(parent=ss2)
        pm2 = ProcessMeasurement.objects.get(source_sample=ss2)

        self.assertEqual(sl2.child, cs2)
        self.assertEqual(sl2.process_measurement, pm2)
        self.assertEqual(pm2.source_sample, ss2)
        self.assertEqual(pm2.volume_used, 5)
        self.assertEqual(pm2.protocol_name, "Normalization")
        self.assertEqual(pm2.comment, "Comment2")
        self.assertEqual(cs2.volume, 5)
        self.assertEqual(cs2.creation_date, pm2.execution_date)
        self.assertEqual(cs2.creation_date, datetime.strptime("2022-07-05", "%Y-%m-%d").date())

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Final Volume', object_id=pm2.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm2.id)

        pt_2 = PropertyType.objects.get(name='Final Concentration', object_id=pm2.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm2.id)

        self.assertEqual(p_1.value, '5.000')
        self.assertEqual(p_2.value, '10.000')

        # Destination sample 3 test
        self.assertTrue(Sample.objects.filter(container__barcode="DESTINATION_CONTAINER", coordinates="A03").exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss3).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss3).exists())

        cs3 = Sample.objects.get(container__barcode="DESTINATION_CONTAINER", coordinates="A03")
        sl3 = SampleLineage.objects.get(parent=ss3)
        pm3 = ProcessMeasurement.objects.get(source_sample=ss3)

        self.assertEqual(sl3.child, cs3)
        self.assertEqual(sl3.process_measurement, pm3)
        self.assertEqual(pm3.source_sample, ss3)
        self.assertEqual(pm3.volume_used, 5)
        self.assertEqual(pm3.protocol_name, "Normalization")
        self.assertEqual(pm3.comment, "Comment3")
        self.assertEqual(cs3.volume, 5)
        self.assertEqual(cs3.creation_date, pm2.execution_date)
        self.assertEqual(cs3.creation_date, datetime.strptime("2022-07-05", "%Y-%m-%d").date())

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Final Volume', object_id=pm3.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm3.id)

        pt_2 = PropertyType.objects.get(name='Final Concentration', object_id=pm3.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm3.id)

        self.assertEqual(p_1.value, '5.000')
        self.assertEqual(Decimal(p_2.value), convert_concentration_from_nm_to_ngbyul(Decimal(108), Decimal(DSDNA_MW), Decimal(150)))