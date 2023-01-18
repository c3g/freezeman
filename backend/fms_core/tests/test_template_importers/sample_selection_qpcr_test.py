from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import SampleSelectionQPCRImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Sample, SampleKind, ProcessMeasurement, PropertyType, PropertyValue, Taxon

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample


class SampleSelectionQPCRTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SampleSelectionQPCRImporter()
        self.file = APP_DATA_ROOT / "Sample_selection_qpcr_v3_10_0.xlsx"
        ContentType.objects.clear_cache()

        self.positive_sample = {"sample_name": "SampleTestQPCR1",
                                "sample_new_volume": 98,
                                "process_volume_used": 2,
                                "sample_new_depleted": False,
                                "date": datetime.datetime(2022, 1, 28, 0, 0),
                                "type": "Roche LightCycle SaberCoV E-gene assay",
                                "ct_value_exp_1": "0.500",
                                "ct_value_control": "0.500",
                                "status": "Positive"}

        self.negative_sample = {"sample_name": "SampleTestQPCR2",
                                "sample_new_volume": 95,
                                "process_volume_used": 5,
                                "sample_new_depleted": True,
                                "date": datetime.datetime(2022, 1, 28, 0, 0),
                                "type": "NEB Luna SARS-Cov2 Multiplex assay",
                                "ct_value_exp_1": "46.230",
                                "ct_value_exp_2": "32.500",
                                "ct_value_control": "25.000",
                                "status": "Negative"}

        self.prefill_data()


    def prefill_data(self):
        sample_kind, _ = SampleKind.objects.get_or_create(name='SWAB')
        taxon = Taxon.objects.get(name='Homo sapiens')

        container1, errors, warnings = create_container(barcode='CONTAINER4QPCR1', kind='Tube', name='Container4QPCR1')
        container2, errors, warnings = create_container(barcode='CONTAINER4QPCR2', kind='Tube', name='Container4QPCR2')

        individual, _, errors, warnings = get_or_create_individual(name='Individual4QPCR', taxon=taxon)

        # self.positive_sample
        create_full_sample(name=self.positive_sample["sample_name"], volume=100, concentration=25, collection_site='TestCaseSite',
                           creation_date=datetime.datetime(2022, 1, 27, 0, 0),
                           container=container1, individual=individual, sample_kind=sample_kind)

        # self.negative_sample
        create_full_sample(name=self.negative_sample["sample_name"], volume=100, concentration=25, collection_site='TestCaseSite',
                           creation_date=datetime.datetime(2022, 1, 27, 0, 0),
                           container=container2, individual=individual, sample_kind=sample_kind)

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        # Positive Sample information tests
        sample1 = Sample.objects.get(name=self.positive_sample["sample_name"])
        self.assertEqual(sample1.volume, self.positive_sample["sample_new_volume"])
        self.assertEqual(sample1.depleted, self.positive_sample["sample_new_depleted"])

        # Process measurement tests
        self.assertTrue(ProcessMeasurement.objects.get(source_sample=sample1, execution_date=self.positive_sample["date"]))
        pm = ProcessMeasurement.objects.get(source_sample=sample1, execution_date=self.positive_sample["date"])

        self.assertEqual(pm.volume_used, self.positive_sample["process_volume_used"])
        self.assertEqual(pm.process.protocol.name, 'Sample Selection using qPCR')
        self.assertEqual(pm.comment, 'This is a QPCR comment.')

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='CT Value (Experimental) 1', object_id=pm.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm.id)

        pt_2 = PropertyType.objects.get(name='CT Value (Control)', object_id=pm.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm.id)

        pt_3 = PropertyType.objects.get(name='qPCR Status', object_id=pm.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm.id)

        pt_4 = PropertyType.objects.get(name='qPCR Type', object_id=pm.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm.id)

        self.assertEqual(p_1.value, self.positive_sample["ct_value_exp_1"])
        self.assertEqual(p_2.value, self.positive_sample["ct_value_control"])
        self.assertEqual(p_3.value, self.positive_sample["status"])
        self.assertEqual(p_4.value, self.positive_sample["type"])

        # Negative Sample information tests
        sample2 = Sample.objects.get(name=self.negative_sample["sample_name"])
        self.assertEqual(sample2.volume, self.negative_sample["sample_new_volume"])
        self.assertEqual(sample2.depleted, self.negative_sample["sample_new_depleted"])

        # Process measurement tests
        self.assertTrue(ProcessMeasurement.objects.get(source_sample=sample2, execution_date=self.negative_sample["date"]))
        pm = ProcessMeasurement.objects.get(source_sample=sample2, execution_date=self.negative_sample["date"])
        
        self.assertEqual(pm.volume_used, self.negative_sample["process_volume_used"])
        self.assertEqual(pm.process.protocol.name, 'Sample Selection using qPCR')
        self.assertEqual(pm.comment, 'This is not a Covid Positive.')

        # Property Values tests
        pt_1 = PropertyType.objects.get(name='CT Value (Experimental) 1', object_id=pm.process.protocol.id)
        p_1 = PropertyValue.objects.get(property_type_id=pt_1, object_id=pm.id)

        pt_2 = PropertyType.objects.get(name='CT Value (Control)', object_id=pm.process.protocol.id)
        p_2 = PropertyValue.objects.get(property_type_id=pt_2, object_id=pm.id)

        pt_3 = PropertyType.objects.get(name='qPCR Status', object_id=pm.process.protocol.id)
        p_3 = PropertyValue.objects.get(property_type_id=pt_3, object_id=pm.id)

        pt_4 = PropertyType.objects.get(name='qPCR Type', object_id=pm.process.protocol.id)
        p_4 = PropertyValue.objects.get(property_type_id=pt_4, object_id=pm.id)

        pt_5 = PropertyType.objects.get(name='CT Value (Experimental) 2', object_id=pm.process.protocol.id)
        p_5 = PropertyValue.objects.get(property_type_id=pt_5, object_id=pm.id)

        self.assertEqual(p_1.value, self.negative_sample["ct_value_exp_1"])
        self.assertEqual(p_2.value, self.negative_sample["ct_value_control"])
        self.assertEqual(p_3.value, self.negative_sample["status"])
        self.assertEqual(p_4.value, self.negative_sample["type"])
        self.assertEqual(p_5.value, self.negative_sample["ct_value_exp_2"])



