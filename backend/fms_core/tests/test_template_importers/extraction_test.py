from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime
from decimal import Decimal

from fms_core.template_importer.importers import ExtractionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, Individual, SampleKind, ProcessMeasurement, SampleLineage, Taxon

from fms_core.services.container import get_or_create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample


class ExtractionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ExtractionImporter()
        self.file = APP_DATA_ROOT / "Sample_extraction_v3_10_0.xlsx"
        ContentType.objects.clear_cache()

        self.prefill_data()


    def prefill_data(self):
        sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name='BLOOD')
        taxon = Taxon.objects.get(name='Homo sapiens')

        samples_info = [
            {'name': 'sample1extraction', 'volume': 100, 'container_barcode': 'tube001', 'individual_name': 'Individual1Extraction'},
            {'name': 'sample2extraction', 'volume': 90, 'container_barcode': 'tube002', 'individual_name': 'Individual2Extraction'},
        ]

        for info in samples_info:
            (container, _, errors, warnings) = get_or_create_container(barcode=info['container_barcode'], kind='tube', name=info['container_barcode'])

            (individual, errors, warnings) = get_or_create_individual(name=info['individual_name'], taxon=taxon)
            (sample, errors, warnings) = create_full_sample(name=info['name'], volume=info['volume'], collection_site='site1',
                                                            creation_date=datetime.datetime(2020, 5, 21, 0, 0),
                                                            container=container, individual=individual, sample_kind=sample_kind_BLOOD)

        (container_rack001, _, errors, warnings) = get_or_create_container(barcode='rack001', name='rack001', kind='tube rack 8x12')

        destination_containers_info = [
            {'barcode': 'tube003', 'name': 'tube003', 'kind': 'tube', 'coordinates': 'A01', 'container_parent': container_rack001},
            {'barcode': 'tube004', 'name': 'tube004', 'kind': 'tube', 'coordinates': 'B01', 'container_parent': container_rack001},
            {'barcode': 'plate002', 'name': 'extract_plate', 'kind': '96-well plate', 'coordinates': None, 'container_parent': None},
        ]
        for info in destination_containers_info:
            get_or_create_container(barcode=info['barcode'], name=info['name'], kind=info['kind'],
                                    coordinates=info['coordinates'], container_parent=info['container_parent'])


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)

        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        s = Sample.objects.get(container__barcode="tube003")
        sl = SampleLineage.objects.get(parent=s.extracted_from, child=s)
        ps = ProcessMeasurement.objects.get(source_sample_id=s.extracted_from.id, lineage=sl)
        self.assertEqual(sl.process_measurement_id, ps.id)
        self.assertEqual('Extraction', ps.process.protocol.name)
        self.assertEqual(s.extracted_from.volume, Decimal("97.000"))
        self.assertFalse(s.extracted_from.depleted)

        s = Sample.objects.get(container__barcode="tube004")
        sl = SampleLineage.objects.get(parent=s.extracted_from, child=s)
        ps = ProcessMeasurement.objects.get(source_sample_id=s.extracted_from.id, lineage=sl)
        self.assertEqual(sl.process_measurement_id, ps.id)
        self.assertEqual('Extraction', ps.process.protocol.name)
        self.assertEqual('comment 4', ps.comment)
        self.assertEqual(s.extracted_from.volume, Decimal("75.000"))
        self.assertTrue(s.extracted_from.depleted)
