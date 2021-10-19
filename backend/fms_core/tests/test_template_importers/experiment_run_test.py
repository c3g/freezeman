from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import ExperimentRunImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import ExperimentRun, SampleKind, Process, PropertyValue, PropertyType

from fms_core.services.container import create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_sample


class ExperimentRunTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = ExperimentRunImporter()
        self.file = APP_DATA_ROOT / "Experiment_Infinium_24_vtest.xlsx"
        ContentType.objects.clear_cache()

        self.container_barcode = "EQ00539851"
        self.sample_name = "ExperimentTestSample"

        self.prefill_data()


    def prefill_data(self):
        sample_kind_RNA, _ = SampleKind.objects.get_or_create(name='RNA')

        (container, errors, warnings) = create_container(barcode=self.container_barcode, kind='Tube', name=self.container_barcode)

        (individual, errors, warnings) = get_or_create_individual(name='Individual4TestExperimentRun', taxon='Homo sapiens')

        create_sample(name=self.sample_name, volume=29, collection_site='site1',
                      creation_date=datetime.datetime(2020, 5, 21, 0, 0), container=container,
                      individual=individual, sample_kind=sample_kind_RNA)


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        self.assertTrue(ExperimentRun.objects.count(), 1)

        # Test first experiment run
        experiment_run_obj = ExperimentRun.objects.get(container__barcode="hh")
        process_obj = Process.objects.get(experiment_runs=experiment_run_obj)
        content_type_process = ContentType.objects.get_for_model(Process)

        # Experiment Run tests
        self.assertEqual(experiment_run_obj.experiment_type.workflow, 'Infinium Global Screening Array-24')
        self.assertEqual(experiment_run_obj.instrument.name, 'iScan_1')

        # Process Tests
        self.assertEqual(process_obj.child_process.count(), 7)
        self.assertEqual(process_obj.protocol.name, 'Illumina Infinium Preparation')

        # Sub-process Tests (check properties for one process and sub-processes in depth)
        # Amplification subprocess
        cp1_1 = Process.objects.get(parent_process=process_obj, protocol__name='Infinium: Amplification')

        cp1_1_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id,
                                             property_type=PropertyType.objects.get(name='MSA3 Plate Barcode'))
        cp1_1_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id,
                                             property_type__name='0.1N NaOH formulation date')
        cp1_1_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id,
                                             property_type__name='Reagent MA1 Barcode')
        cp1_1_p4 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id,
                                             property_type__name='Reagent MA2 Barcode')
        cp1_1_p5 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id,
                                             property_type__name='Reagent MSM Barcode')
        cp1_1_p6 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id,
                                             property_type__name='Incubation time In Amplification')
        cp1_1_p7 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id,
                                             property_type__name='Incubation time Out Amplification')
        cp1_1_p8 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id,
                                             property_type__name='Comment Amplification')

        # Check property values for Amplification sub-process
        self.assertEqual(cp1_1_p1.value, 'PlateBarcode')
        self.assertEqual(cp1_1_p2.value, '2021-04-03')
        self.assertEqual(cp1_1_p3.value, 'ReagentAmpBarcode')
        self.assertEqual(cp1_1_p4.value, 'ReagentMA2BarcodeHere')
        self.assertEqual(cp1_1_p5.value, 'MSMBarcode')
        self.assertEqual(cp1_1_p6.value, '03:00:00')
        self.assertEqual(cp1_1_p7.value, '04:00:00')
        self.assertEqual(cp1_1_p8.value, ' ')
