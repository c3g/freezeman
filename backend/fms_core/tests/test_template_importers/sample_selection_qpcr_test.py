from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import SampleSelectionQPCRImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, SampleKind, ProcessMeasurement, PropertyType, PropertyValue

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample


class SampleSelectionQPCRTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleSelectionQPCRImporter()
        self.file = APP_DATA_ROOT / "Sample_selection_qpcr_v3_6_0.xlsx"
        ContentType.objects.clear_cache()

        self.sample_name = 'SampleTestQPCR'
        self.sample_new_volume = 98
        self.process_volume_used = 2
        self.sample_new_depleted = False
        self.date = datetime.datetime(2022, 1, 28, 0, 0)
        self.type = 'qPCR COVID kit'
        self.ct_value_exp = '0.5'
        self.ct_value_control = '0.5'
        self.status = 'Positive'
        self.prefill_data()


    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')

        (container, errors, warnings) = create_container(barcode='CONTAINER4QPCR', kind='Tube', name='Container4QPCR')

        (individual, errors, warnings) = get_or_create_individual(name='Individual4QPCR', taxon='Homo sapiens')

        create_full_sample(name=self.sample_name, volume=100, concentration=25, collection_site='TestCaseSite',
                           creation_date=datetime.datetime(2022, 1, 28, 0, 0),
                           container=container, individual=individual, sample_kind=sample_kind)


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        # Sample information tests
        sample = Sample.objects.get(name=self.sample_name)
        #self.assertEqual(sample.volume, self.sample_new_volume)
        self.assertEqual(sample.depleted, self.sample_new_depleted)

        # Process measurement tests
        self.assertTrue(ProcessMeasurement.objects.get(source_sample=sample,
                                            execution_date=self.date
                                            ))
        pm = ProcessMeasurement.objects.get(source_sample=sample,
                                            execution_date=self.date
                                            )
        self.assertEqual(pm.volume_used, self.process_volume_used)

        self.assertEqual(pm.process.protocol.name, 'Sample Selection using qPCR')
        self.assertEqual(pm.comment, 'This is a QPCR comment.')

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='CT Value (Experimental)', object_id=pm.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm.id)

        pt_2 = PropertyType.objects.get(name='CT Value (Control)', object_id=pm.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm.id)

        pt_3 = PropertyType.objects.get(name='qPCR Status', object_id=pm.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm.id)

        pt_4 = PropertyType.objects.get(name='qPCR Type', object_id=pm.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm.id)

        self.assertEqual(p_1.value, self.ct_value_exp)
        self.assertEqual(p_2.value, self.ct_value_control)
        self.assertEqual(p_3.value, self.status)
        self.assertEqual(p_4.value, self.type)




