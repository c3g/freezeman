from django.test import TestCase
from datetime import datetime
from decimal import Decimal

from fms_core.template_importer.importers import NormalizationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, Container, SampleKind, ProcessMeasurement, SampleLineage

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
            {'name': 'Sample1Normalization', 'volume': 400, 'container_barcode': 'SOURCE_CONTAINER', 'coordinates': 'A01'},
            {'name': 'Sample2Normalization', 'volume': 400, 'container_barcode': 'SOURCE_CONTAINER', 'coordinates': 'A02'},
            {'name': 'Sample3Normalization', 'volume': 400, 'container_barcode': 'SOURCE_CONTAINER', 'coordinates': 'A03'},
        ]

        for info in samples_info:
            (container, _, errors, warnings) = get_or_create_container(barcode=info['container_barcode'], kind='96-well plate', name=info['container_barcode'])

            (sample, errors, warnings) = create_full_sample(name=info['name'], volume=info['volume'],
                                                            collection_site='site1',
                                                            creation_date=datetime(2022, 7, 5, 0, 0),
                                                            concentration=10,
                                                            container=container, coordinates=info['coordinates'],
                                                            sample_kind=sample_kind_DNA)

        (container_rack, _, errors, warnings) = get_or_create_container(barcode='RackTransfer', name='RackTransfer', kind='tube rack 8x12')

        destination_containers_info = [
            {'barcode': 'DESTINATION_CONTAINER', 'name': 'DESTINATION_CONTAINER', 'kind': '96-well plate'},
        ]
        for info in destination_containers_info:
            get_or_create_container(barcode=info['barcode'], name=info['name'], kind=info['kind'])


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)

        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        ss1 = Sample.objects.get(container__barcode="Transfer_container_source_1", coordinates="A01")
        self.assertEqual(ss1.volume, 200)
        self.assertFalse(ss1.depleted)
        self.assertTrue(Sample.objects.filter(container__barcode="Transfer_container_dest_1", coordinates="A01").exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss1).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss1).exists())
        cs1 = Sample.objects.get(container__barcode="Transfer_container_dest_1", coordinates="A01")
        sl1 = SampleLineage.objects.get(parent=ss1)
        pm1 = ProcessMeasurement.objects.get(source_sample=ss1)
        process1 = pm1.process
        self.assertEqual(sl1.child, cs1)
        self.assertEqual(sl1.process_measurement, pm1)
        self.assertEqual(pm1.source_sample, ss1)
        self.assertEqual(pm1.volume_used, 200)
        self.assertEqual(pm1.protocol_name, "Transfer")
        self.assertEqual(pm1.comment, "One Test")
        self.assertEqual(cs1.volume, 200)
        self.assertEqual(cs1.creation_date, pm1.execution_date)
        self.assertEqual(cs1.creation_date, datetime.strptime("2021-10-10", "%Y-%m-%d").date())

        ss2 = Sample.objects.get(container__barcode="Transfer_container_source_1", coordinates="A02")
        self.assertEqual(ss2.volume, 300)
        self.assertFalse(ss2.depleted)
        self.assertTrue(Container.objects.filter(barcode="Transfer_container_dest_2", name="NewContainer").exists())
        self.assertTrue(Sample.objects.filter(container__barcode="Transfer_container_dest_2").exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss2).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss2).exists())
        cs2 = Sample.objects.get(container__barcode="Transfer_container_dest_2", container__coordinates="H08")
        sl2 = SampleLineage.objects.get(parent=ss2)
        pm2 = ProcessMeasurement.objects.get(source_sample=ss2)
        process2 = pm2.process
        self.assertEqual(sl2.child, cs2)
        self.assertEqual(sl2.process_measurement, pm2)
        self.assertEqual(pm2.source_sample, ss2)
        self.assertEqual(pm2.volume_used, 100)
        self.assertEqual(pm2.protocol_name, "Transfer")
        self.assertEqual(pm2.comment, "Two Test")
        self.assertEqual(cs2.volume, 100)
        self.assertEqual(process2, process1)
        self.assertEqual(cs2.creation_date, pm2.execution_date)
        self.assertEqual(cs2.creation_date, datetime.strptime("2021-09-02", "%Y-%m-%d").date())

        ss3 = Sample.objects.get(container__barcode="Transfer_container_source_1", coordinates="A03")
        self.assertEqual(ss3.volume, 0)
        self.assertTrue(ss3.depleted)
        self.assertTrue(Sample.objects.filter(container__barcode="Transfer_container_dest_1", coordinates="A02").exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss3).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss3).exists())
        cs3 = Sample.objects.get(container__barcode="Transfer_container_dest_1", coordinates="A02", container__coordinates="A01")
        sl3 = SampleLineage.objects.get(parent=ss3)
        pm3 = ProcessMeasurement.objects.get(source_sample=ss3)
        process3 = pm3.process
        self.assertEqual(sl3.child, cs3)
        self.assertEqual(sl3.process_measurement, pm3)
        self.assertEqual(pm3.source_sample, ss3)
        self.assertEqual(pm3.volume_used, 400)
        self.assertEqual(pm3.protocol_name, "Transfer")
        self.assertEqual(pm3.comment, "Three Test")
        self.assertEqual(cs3.volume, 400)
        self.assertEqual(process3, process2)
        self.assertEqual(cs3.creation_date, pm3.execution_date)
        self.assertEqual(cs3.creation_date, datetime.strptime("2021-09-22", "%Y-%m-%d").date())