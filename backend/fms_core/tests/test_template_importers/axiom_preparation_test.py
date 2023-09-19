from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime
from decimal import Decimal
from django.db.models import Subquery
from fms_core.template_importer.importers import AxiomPreparationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, SampleKind, ProcessMeasurement, Taxon, PropertyValue, Process

from fms_core.services.container import get_or_create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample


class AxiomPreparationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = AxiomPreparationImporter()
        self.file = APP_DATA_ROOT / "Axiom_sample_preparation_v4_5_0.xlsx"
        ContentType.objects.clear_cache()

        self.prefill_data()


    def prefill_data(self):
        sample_kind_DNA, _ = SampleKind.objects.get_or_create(name='DNA')
        taxon = Taxon.objects.get(name='Homo sapiens')

        samples_info = [
            {'name': 'SampleAxiom1', 'volume': 100, 'container_barcode': 'AxiomPlate', 'coordinates': 'A01', 'individual_name': 'IndividualAxiom1'},
            {'name': 'SampleAxiom2', 'volume': 100, 'container_barcode': 'AxiomPlate', 'coordinates': 'A02', 'individual_name': 'IndividualAxiom2'},
            {'name': 'SampleAxiom3', 'volume': 100, 'container_barcode': 'AxiomPlate', 'coordinates': 'B03', 'individual_name': 'IndividualAxiom3'},
        ]
        
        for info in samples_info:
            container, _, errors, warnings = get_or_create_container(barcode=info['container_barcode'], kind='96-well plate', name=info['container_barcode'])
            individual, _, errors, warnings = get_or_create_individual(name=info['individual_name'], taxon=taxon)
            sample, errors, warnings = create_full_sample(name=info['name'], volume=info['volume'], collection_site='site1',
                                                          creation_date=datetime.datetime(2020, 5, 21, 0, 0),
                                                          container=container, coordinates=info['coordinates'],
                                                          individual=individual, sample_kind=sample_kind_DNA)


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)

        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        s1 = Sample.objects.get(container__barcode="AxiomPlate", coordinate__name="A01")
        ps1 = ProcessMeasurement.objects.get(source_sample_id=s1.id)
        self.assertIsNotNone(ps1)
        self.assertIsNone(ps1.volume_used)
        self.assertEqual('Axiom Sample Preparation', ps1.process.protocol.name)

        s2 = Sample.objects.get(container__barcode="AxiomPlate", coordinate__name="A02")
        ps2 = ProcessMeasurement.objects.get(source_sample_id=s2.id)
        self.assertIsNotNone(ps2)
        self.assertIsNone(ps2.volume_used)
        self.assertEqual('Axiom Sample Preparation', ps2.process.protocol.name)

        s3 = Sample.objects.get(container__barcode="AxiomPlate", coordinate__name="B03")
        ps3 = ProcessMeasurement.objects.get(source_sample_id=s3.id)
        self.assertIsNotNone(ps3)
        self.assertIsNone(ps3.volume_used)
        self.assertEqual('Axiom Sample Preparation', ps3.process.protocol.name)

        self.assertEqual(ps2.process, ps1.process)
        self.assertEqual(ps2.process, ps3.process)

        process_content_type = ContentType.objects.get(model='process')
        property_values = PropertyValue.objects.filter(content_type_id=process_content_type.id, object_id__in=Subquery(Process.objects.filter(parent_process_id=ps1.process.id).values_list("id", flat=True)))

        EXPECTED_VALUES = {
            "Axiom Module 1 Barcode": "Module1Barcode",
            "Incubation Time In Amplification": "2023-09-10 10:34",
            "Incubation Time Out Amplification": "2023-09-10 10:56",
            "Liquid Handler Instrument Amplification": "Nimbus 1",
            "Stored Before Fragmentation": "No",
            "Comment Amplification": "Ampli Comment",
            "Axiom Module 2.1 Barcode Fragmentation": "Module21BarcodeFrag",
            "Axiom Module 2.2 Barcode Fragmentation": "Module22BarcodeFrag",
            "Liquid Handler Instrument Fragmentation": "Nimbus 1",
            "Comment Fragmentation": " ", # None property values are replaced with a string containing a single space
            "Axiom Module 2.1 Barcode Precipitation": "Module21BarcodePrec",
            "Axiom Module 2.2 Barcode Precipitation": "Module22BarcodePrec",
            "Liquid Handler Instrument Precipitation": "Nimbus 2",
            "Comment Precipitation": "Precipitation Comment",
        }

        for property_value in property_values.all():
            self.assertEqual(EXPECTED_VALUES[property_value.property_type.name], property_value.value)