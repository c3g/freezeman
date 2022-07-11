from django.test import TestCase
from datetime import datetime
from decimal import Decimal

from fms_core.template_importer.importers import NormalizationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, SampleKind, ProcessMeasurement, SampleLineage, PropertyType, PropertyValue

from fms_core.services.container import get_or_create_container
from fms_core.services.sample import create_full_sample


class NormalizationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = NormalizationImporter()
        self.file = APP_DATA_ROOT / "Normalization_v3_10_0.xlsx"

        self.prefill_data()


    def prefill_data(self):
        sample_kind_DNA, _ = SampleKind.objects.get_or_create(name='DNA')

        samples_info = [
            {'name': 'Sample1Normalization', 'volume': 30, 'container_barcode': 'SOURCE_CONTAINER', 'coordinates': 'A01'},
            {'name': 'Sample2Normalization', 'volume': 30, 'container_barcode': 'SOURCE_CONTAINER', 'coordinates': 'A02'},
            {'name': 'Sample3Normalization', 'volume': 30, 'container_barcode': 'SOURCE_CONTAINER', 'coordinates': 'A03'},
        ]

        for info in samples_info:
            (container, _, errors, warnings) = get_or_create_container(barcode=info['container_barcode'], kind='96-well plate', name=info['container_barcode'])

            (sample, errors, warnings) = create_full_sample(name=info['name'], volume=info['volume'],
                                                            collection_site='site1',
                                                            creation_date=datetime(2022, 7, 5, 0, 0),
                                                            concentration=10,
                                                            container=container, coordinates=info['coordinates'],
                                                            sample_kind=sample_kind_DNA)

        destination_containers_info = [
            {'barcode': 'DESTINATION_CONTAINER', 'name': 'DESTINATION_CONTAINER', 'kind': '96-well plate'},
        ]
        for info in destination_containers_info:
            get_or_create_container(barcode=info['barcode'], name=info['name'], kind=info['kind'])


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)

        self.assertEqual(result['valid'], True)

        # Source sample tests
        ss1 = Sample.objects.get(container__barcode="SOURCE_CONTAINER", coordinates="A01")
        self.assertEqual(ss1.volume, 25)
        self.assertFalse(ss1.depleted)

        # Destination sample test
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
        self.assertEqual(cs1.volume, 5)
        self.assertEqual(cs1.creation_date, pm1.execution_date)
        self.assertEqual(cs1.creation_date, datetime.strptime("2022-07-05", "%Y-%m-%d").date())

        '''
        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Volume', object_id=pm1.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm1.id)

        pt_2 = PropertyType.objects.get(name='Concentration', object_id=pm1.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm1.id)

        self.assertEqual(p_1.value, 5)
        self.assertEqual(p_2.value, 20)
        '''