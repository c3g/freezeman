from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime
from decimal import Decimal

from fms_core.template_importer.importers import QCIntegrationSparkImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import (Sample, Individual, SampleKind, ProcessMeasurement, Taxon, PropertyValue,
                             Step, SampleNextStep, SampleNextStepByStudy, Workflow)

from fms_core.services.container import get_or_create_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.sample import create_full_sample
from fms_core.services.project import create_project
from fms_core.services.study import create_study
from fms_core.services.sample_next_step import queue_sample_to_study_workflow


class QcIntegrationSparkTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = QCIntegrationSparkImporter()
        self.file = APP_DATA_ROOT / "QC_Integration_Spark_v4_6_0.asc"
        ContentType.objects.clear_cache()

        self.prefill_data()


    def prefill_data(self):
        sample_kind_DNA, _ = SampleKind.objects.get_or_create(name="DNA")
        taxon = Taxon.objects.get(name="Homo sapiens")
        workflow = Workflow.objects.get(name="Axiom Genotyping")
        project, _, _ = create_project(name="AxiomTestProject")
        study, _, _ = create_study(project=project,
                                   workflow=workflow,
                                   start=1,
                                   end=7)

        samples_info = [
            {'name': 'sample1Spark', 'volume': 100, 'container_barcode': 'TestPlate01', 'coordinates': 'A01', 'individual_name': 'Individual1Spark', 'project': project},
            {'name': 'sample2Spark', 'volume': 90, 'container_barcode': 'TestPlate01', 'coordinates': 'B01', 'individual_name': 'Individual2Spark', 'project': project},
            {'name': 'sample3Spark', 'volume': 200, 'container_barcode': 'TestPlate01', 'coordinates': 'C01', 'individual_name': 'Individual3Spark', 'project': project},
        ]

        for info in samples_info:
            container, _, errors, warnings = get_or_create_container(barcode=info['container_barcode'], kind='96-well plate', name=info['container_barcode'])

            individual, _, errors, warnings = get_or_create_individual(name=info['individual_name'], taxon=taxon)
            sample, errors, warnings = create_full_sample(name=info['name'], volume=info['volume'], collection_site='site1', project=info['project'],
                                                          creation_date=datetime.datetime(2023, 11, 7, 0, 0), container=container,
                                                          coordinates=info['coordinates'], individual=individual, sample_kind=sample_kind_DNA)
            # Queue sample to qc integration step
            queue_sample_to_study_workflow(sample_obj=sample,
                                           study_obj=study,
                                           order=5) # order 5 in Axiom Workflow is 

    def test_import(self):
        content_type_processmeasurement = ContentType.objects.get_for_model(ProcessMeasurement)
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Custom test for each sample
        s1 = Sample.objects.get(container__barcode="TestPlate01", coordinate__name="A01")
        ps1 = ProcessMeasurement.objects.get(source_sample_id=s1.id, process__protocol__name="Quality Control - Integration")
        pv1_1 = PropertyValue.objects.get(content_type=content_type_processmeasurement, object_id=ps1.id,
                                          property_type__name="Quantity QC Flag")
        pv1_2 = PropertyValue.objects.get(content_type=content_type_processmeasurement, object_id=ps1.id,
                                          property_type__name="Quantity Instrument")
        pv1_3 = PropertyValue.objects.get(content_type=content_type_processmeasurement, object_id=ps1.id,
                                          property_type__name="Mass/rxn (ug)")

        self.assertEqual('Quality Control - Integration', ps1.process.protocol.name)
        self.assertEqual(s1.quantity_flag, True)
        self.assertIsNone(s1.quality_flag)
        self.assertEqual(pv1_1.value, "Passed")
        self.assertEqual(pv1_2.value, "Spark 10M")
        self.assertEqual(pv1_3.value, "1134.700")

        s2 = Sample.objects.get(container__barcode="TestPlate01", coordinate__name="B01")
        ps2 = ProcessMeasurement.objects.get(source_sample_id=s2.id, process__protocol__name="Quality Control - Integration")
        pv2_1 = PropertyValue.objects.get(content_type=content_type_processmeasurement, object_id=ps2.id,
                                          property_type__name="Quantity QC Flag")
        pv2_2 = PropertyValue.objects.get(content_type=content_type_processmeasurement, object_id=ps2.id,
                                          property_type__name="Quantity Instrument")
        pv2_3 = PropertyValue.objects.get(content_type=content_type_processmeasurement, object_id=ps2.id,
                                          property_type__name="Mass/rxn (ug)")

        self.assertEqual('Quality Control - Integration', ps2.process.protocol.name)
        self.assertEqual(s2.quantity_flag, False)
        self.assertIsNone(s2.quality_flag)
        self.assertEqual(pv2_1.value, "Failed")
        self.assertEqual(pv2_2.value, "Spark 10M")
        self.assertEqual(pv2_3.value, "800.600")

        s3 = Sample.objects.get(container__barcode="TestPlate01", coordinate__name="C01")
        ps3 = ProcessMeasurement.objects.get(source_sample_id=s3.id, process__protocol__name="Quality Control - Integration")
        pv3_1 = PropertyValue.objects.get(content_type=content_type_processmeasurement, object_id=ps3.id,
                                          property_type__name="Quantity QC Flag")
        pv3_2 = PropertyValue.objects.get(content_type=content_type_processmeasurement, object_id=ps3.id,
                                          property_type__name="Quantity Instrument")
        try:
            pv3_3 = PropertyValue.objects.get(content_type=content_type_processmeasurement, object_id=ps3.id,
                                              property_type__name="Mass/rxn (ug)")
        except PropertyValue.DoesNotExist:
            pv3_3 = None
        self.assertEqual('Quality Control - Integration', ps3.process.protocol.name)
        self.assertEqual(s3.quantity_flag, False)
        self.assertIsNone(s3.quality_flag)
        self.assertEqual(pv3_1.value, "Failed")
        self.assertEqual(pv3_2.value, "Spark 10M")
        self.assertIsNone(pv3_3)

    def test_import_samples_not_queued(self):
        # Importing first time to move the sample to next step
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)
        # Importing again the same file should fail
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], False)

        # Check the error message
        self.assertEqual(result["base_errors"][0]["error"], "File has likely already been submitted. Samples included are not queued to workflow step Quality Control - Integration (Spark).")