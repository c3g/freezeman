from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import SampleQCImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, SampleKind, ProcessMeasurement, PropertyType, PropertyValue, Taxon

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample


class SampleQCTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleQCImporter()
        self.file = APP_DATA_ROOT / "Sample_QC_v3_7_0.xlsx"
        ContentType.objects.clear_cache()

        self.sample_name = 'SampleTestQC'
        self.sample_new_volume = 98
        self.process_volume_used = 2
        self.sample_new_concentration = 20
        self.sample_new_depleted = False
        self.update_date = datetime.datetime(2021, 12, 21, 0, 0)
        self.quality_flag = True
        self.quantity_flag = True
        self.process_ql_instrument = 'Agarose Gel'
        self.process_qt_instrument = 'PicoGreen'
        self.prefill_data()


    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
        taxon = Taxon.objects.get(name='Homo sapiens')

        (container, errors, warnings) = create_container(barcode='CONTAINER4SAMPLEQC', kind='Tube', name='Container4SampleQC')

        (individual, errors, warnings) = get_or_create_individual(name='Individual4SampleQC', taxon=taxon)

        create_full_sample(name=self.sample_name, volume=100, concentration=25, collection_site='TestCaseSite',
                           creation_date=datetime.datetime(2021, 1, 15, 0, 0),
                           container=container, individual=individual, sample_kind=sample_kind)


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        # Sample information tests
        sample = Sample.objects.get(name=self.sample_name)
        self.assertEqual(sample.volume, self.sample_new_volume)
        self.assertEqual(sample.concentration, self.sample_new_concentration)
        self.assertEqual(sample.depleted, self.sample_new_depleted)
        # Sample flag tests
        self.assertEqual(sample.quality_flag, self.quality_flag)
        self.assertEqual(sample.quantity_flag, self.quantity_flag)

        # Process measurement tests
        self.assertTrue(ProcessMeasurement.objects.get(source_sample=sample,
                                            execution_date=self.update_date
                                            ))
        pm = ProcessMeasurement.objects.get(source_sample=sample,
                                            execution_date=self.update_date
                                            )
        self.assertEqual(pm.volume_used, self.process_volume_used)

        self.assertEqual(pm.process.protocol.name, 'Sample Quality Control')

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='Quantity Instrument', object_id=pm.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm.id)

        pt_2 = PropertyType.objects.get(name='Quality Instrument', object_id=pm.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm.id)

        self.assertEqual(p_1.value, self.process_qt_instrument)
        self.assertEqual(p_2.value, self.process_ql_instrument)




