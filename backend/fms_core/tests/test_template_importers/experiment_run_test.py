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
        self.assertEqual(experiment_run_obj.run_type.name, 'Infinium Global Screening Array-24')
        self.assertEqual(experiment_run_obj.instrument.name, 'iScan_1')

        # Process Tests
        self.assertEqual(process_obj.child_process.count(), 7)
        self.assertEqual(process_obj.protocol.name, 'Illumina Infinium Preparation')

        # Sub-process Tests (check properties for one process and sub-processes in depth)
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

        cp1_2 = Process.objects.get(parent_process=process_obj, protocol__name='Infinium: Fragmentation')
        cp1_2_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_2.id,
                                             property_type__name='Reagent FMS Barcode')
        cp1_2_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_2.id,
                                             property_type__name='Comment Fragmentation')
        # Check property values for Fragmentation sub-process
        self.assertEqual(cp1_2_p1.value, 'FragFMSBarcode')
        self.assertEqual(cp1_2_p2.value, 'short comment')

        cp1_3 = Process.objects.get(parent_process=process_obj, protocol__name='Infinium: Precipitation')
        cp1_3_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_3.id,
                                             property_type__name='Reagent PM1 Barcode')
        cp1_3_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_3.id,
                                             property_type__name='Reagent RA1 Barcode Precipitation')
        cp1_3_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_3.id,
                                             property_type__name='Comment Precipitation')
        # Check property values for Precipitation sub-process
        self.assertEqual(cp1_3_p1.value, 'Pm1Barcode')
        self.assertEqual(cp1_3_p2.value, 'Ra1PrecipBarcode')
        self.assertEqual(cp1_3_p3.value, ' ')

        cp1_4 = Process.objects.get(parent_process=process_obj, protocol__name='Infinium: Hybridization')
        cp1_4_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id,
                                             property_type__name='Hybridization Chip Barcodes')
        cp1_4_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id,
                                             property_type__name='Hybridization Chamber Barcode')
        cp1_4_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id,
                                             property_type__name='Reagent PB2 Barcode')
        cp1_4_p4 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id,
                                             property_type__name='Reagent XC4 Barcode Hybridization')
        cp1_4_p5 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id,
                                             property_type__name='Incubation time In Hybridization')
        cp1_4_p6 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id,
                                             property_type__name='Incubation time Out Hybridization')
        cp1_4_p7 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id,
                                             property_type__name='Comment Hybridization')
        # Check property values for Hybridization sub-process
        self.assertEqual(cp1_4_p1.value, 'HybrBarcodeValue')
        self.assertEqual(cp1_4_p2.value, 'HCBarcode')
        self.assertEqual(cp1_4_p3.value, 'PB2Barcode')
        self.assertEqual(cp1_4_p4.value, 'XC4HyBarcode')
        self.assertEqual(cp1_4_p5.value, '02:00:00')
        self.assertEqual(cp1_4_p6.value, '02:20:00')
        self.assertEqual(cp1_4_p7.value, 'my comment')

        cp1_5 = Process.objects.get(parent_process=process_obj, protocol__name='Infinium: Wash Beadchip')
        cp1_5_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_5.id,
                                             property_type__name='Reagent PB1 Barcode Wash')
        cp1_5_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_5.id,
                                             property_type__name='Comment Wash')
        # Check property values for Wash Beadchip sub-process
        self.assertEqual(cp1_5_p1.value, 'washbeadchipbarcode')
        self.assertEqual(cp1_5_p2.value, ' ')

        cp1_6 = Process.objects.get(parent_process=process_obj, protocol__name='Infinium: Extend and Stain')
        cp1_6_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                             property_type__name='95% form/EDTA')
        cp1_6_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                             property_type__name='Reagent ATM Barcode')
        cp1_6_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                             property_type__name='Reagent EML Barcode')
        cp1_6_p4 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                             property_type__name='Reagent LX1 Barcode')
        cp1_6_p5 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                             property_type__name='Reagent LX2 Barcode')
        cp1_6_p6 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                             property_type__name='Reagent PB1 Barcode Stain')
        cp1_6_p7 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                             property_type__name='Reagent RA1 Barcode Stain')
        cp1_6_p8 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                             property_type__name='Reagent SML Barcode')
        cp1_6_p9 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                             property_type__name='Reagent XC3 Barcode')
        cp1_6_p10 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                              property_type__name='Reagent XC4 Barcode Stain')
        cp1_6_p11 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id,
                                              property_type__name='Comment Stain')
        # Check property values for Extend and Stain sub-process
        self.assertEqual(cp1_6_p1.value, 'a')
        self.assertEqual(cp1_6_p2.value, 'atmbarcodehere')
        self.assertEqual(cp1_6_p3.value, 'testbarcode')
        self.assertEqual(cp1_6_p4.value, 'lx1barcode')
        self.assertEqual(cp1_6_p5.value, 'lx2barcode')
        self.assertEqual(cp1_6_p6.value, 'pb1stain')
        self.assertEqual(cp1_6_p7.value, 'ra1stain')
        self.assertEqual(cp1_6_p8.value, 'smltest')
        self.assertEqual(cp1_6_p9.value, 'xc3value')
        self.assertEqual(cp1_6_p10.value, 'xc4stain')
        self.assertEqual(cp1_6_p11.value, ' ')

        cp1_7 = Process.objects.get(parent_process=process_obj, protocol__name='Infinium: Scan Preparation')
        cp1_7_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_7.id,
                                             property_type__name='SentrixBarcode_A')
        cp1_7_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_7.id,
                                             property_type__name='Scan Chip Rack Barcode')
        cp1_7_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_7.id,
                                             property_type__name='Comment Scan')
        # Check property values for Scan Preparation sub-process
        self.assertEqual(cp1_7_p1.value, 'sentrixA')
        self.assertEqual(cp1_7_p2.value, 'lastbarcode')
        self.assertEqual(cp1_7_p3.value, 'bla bla bla')
