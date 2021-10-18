from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import ExtractionImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, Individual, SampleKind, ProcessMeasurement

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_sample


class ExtractionTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ExtractionImporter()
        self.file = APP_DATA_ROOT / "Sample_extraction_vtest.xlsx"
        ContentType.objects.clear_cache()

        self.prefill_data()


    def prefill_data(self):
        sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name='BLOOD')

        samples_info = [
            {'name': 'sample1', 'volume': 100, 'container_barcode': 'tube001', 'individual_name': 'Individual1Extraction'},
            {'name': 'sample2', 'volume': 90, 'container_barcode': 'tube002', 'individual_name': 'Individual2Extraction'},
            {'name': 'sample3', 'volume': 50, 'container_barcode': 'tube003', 'individual_name': 'Individual3Extraction'},
        ]

        for info in samples_info:
            (container, errors, warnings) = create_container(barcode=info['container_barcode'], kind='Tube', name=info['container_barcode'])
            (individual, errors, warnings) = get_or_create_individual(name=info['individual_name'],
                                                                      taxon='Homo sapiens')
            create_sample(name=info['name'], volume=info['volume'], collection_site='site1',
                          creation_date=datetime.datetime(2020, 5, 21, 0, 0),
                          container=container, individual=individual, sample_kind=sample_kind_BLOOD)

        (container_rack001, errors, warnings) = create_container(barcode='rack001', name='rack001', kind='tube rack 8x12')

        destination_containers_info = [
            {'barcode': 'tube003', 'name': 'tube003', 'kind': 'tube', 'coordinates': 'A01', 'container_parent': container_rack001},
            {'barcode': 'tube004', 'name': 'tube004', 'kind': 'tube', 'coordinates': 'B01', 'container_parent': container_rack001},
            {'barcode': 'plate002', 'name': 'extract_plate', 'kind': '96-well plate', 'coordinates': None, 'container_parent': None},
        ]
        for info in destination_containers_info:
            create_container(barcode=info['barcode'], name=info['name'], kind=info['kind'],
                             coordinates=info['coordinates'], container_parent=info['container_parent'])


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        print(result)

        self.assertEqual(result['valid'], True)

        # #Custom tests for each template
        pass
