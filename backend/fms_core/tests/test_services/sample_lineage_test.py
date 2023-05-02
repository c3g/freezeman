from django.test import TestCase
from pathlib import Path

from fms_core.models import Container, SampleKind, ProcessMeasurement, Protocol, Process

from fms_core.services.sample_lineage import create_sample_lineage, get_library_size_for_derived_sample
from fms_core.services.sample import create_full_sample, get_sample_from_container
from fms_core.services.project import create_project
from fms_core.tests.test_template_importers._utils import load_template
from fms_core.template_importer.importers import (SampleSubmissionImporter,
                                                  LibraryPreparationImporter,
                                                  IndexCreationImporter,
                                                  LibraryQCImporter)

class SampleLineageServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        self.sample_parent_name = "SampleParent"
        self.sample_child_name = "SampleChild"
        self.sk_BLOOD = SampleKind.objects.get(name="BLOOD")
        self.sk_DNA = SampleKind.objects.get(name="DNA")

        self.test_container_parent = Container.objects.create(barcode="TESTBARCODEPARENT",
                                                              name="TestParentName",
                                                              kind="tube")

        self.test_container_child = Container.objects.create(barcode="TESTBARCODECHILD",
                                                             name="TestChildName",
                                                             kind="tube")

        self.full_sample_parent, errors, warnings = create_full_sample(name=self.sample_parent_name,
                                                                       volume=20,
                                                                       collection_site="TestCollectionSite",
                                                                       container=self.test_container_parent,
                                                                       sample_kind=self.sk_BLOOD,
                                                                       creation_date="2022-01-01")

        self.full_sample_child, errors, warnings = create_full_sample(name=self.sample_child_name,
                                                                      volume=20,
                                                                      collection_site="TestCollectionSite",
                                                                      container=self.test_container_child,
                                                                      concentration=20,
                                                                      tissue_source=self.sk_BLOOD,
                                                                      sample_kind=self.sk_DNA,
                                                                      creation_date="2022-01-01")

        self.protocol_extraction = Protocol.objects.get(name="Extraction")
        self.process = Process.objects.create(protocol=self.protocol_extraction)
        self.process_measurement = ProcessMeasurement.objects.create(source_sample=self.full_sample_parent, process=self.process,
                                                                     execution_date="2022-01-01", volume_used=5)

    def import_template(self, importer, file):
        TEMPLATES_DIR = Path(__file__).parent.parent / "service-templates"
        template_path = TEMPLATES_DIR / file
        result = load_template(importer=importer, file=template_path)
        if result['valid'] == False:
            raise Exception(f'Failed to import template {file}')

    def test_create_sample_lineage(self):
        lineage, errors, warnings = create_sample_lineage(self.full_sample_parent, self.full_sample_child, self.process_measurement)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(lineage.parent, self.full_sample_parent)
        self.assertEqual(lineage.child, self.full_sample_child)
        self.assertEqual(lineage.process_measurement, self.process_measurement)

    def test_lineage_invalid_child(self):
        lineage, errors, warnings = create_sample_lineage(self.full_sample_parent, self.full_sample_parent, self.process_measurement)
        self.assertEqual(lineage, None)
        self.assertTrue("Extracted sample need to be a type of Nucleic Acid" in errors[0])
        self.assertTrue("Extracted sample need to have a tissue source" in errors[0])
        self.assertTrue("A sample cannot have itself as child" in errors[0])
        self.assertEqual(warnings, [])

    def test_lineage_invalid_parent(self):
        lineage, errors, warnings = create_sample_lineage(self.full_sample_child, self.full_sample_child,
                                                          self.process_measurement)
        self.assertEqual(lineage, None)
        self.assertTrue("Extraction process cannot be run on samples of extracted kinds like DNA and RNA" in errors[0])
        self.assertTrue("Extracted sample tissue_source must match parent sample_kind" in errors[0])
        self.assertTrue("A sample cannot have itself as child" in errors[0])
        self.assertEqual(warnings, [])

    def test_invalid_lineage_call(self):
        lineage, errors, warnings = create_sample_lineage(None, None, None)
        self.assertEqual(lineage, None)
        self.assertEqual(errors, [f"Parent sample is required for sample lineage creation.",
                                  f"Child sample is required for sample lineage creation.",
                                  f"Process measurement is required for sample lineage creation."])
        self.assertEqual(warnings, [])

    def test_get_library_size_for_derived_sample(self):
        
        PROJECT_NAME = 'TEST_PROJECT'
        self.project, _, _ = create_project(name=PROJECT_NAME)

        self.import_template(IndexCreationImporter(), 'Index_creation_v3_7_0.xlsx')
        self.import_template(SampleSubmissionImporter(), 'Sample_submission_v4_2_0.xlsx')
        self.import_template(LibraryPreparationImporter(), 'Library_preparation_v4_1_0.xlsx')
        self.import_template(LibraryQCImporter(), 'Library_QC_v4_1_0.xlsx')

        sample_obj, _, _ = get_sample_from_container(barcode="ER_Container_BC_01",coordinates="B01")
        library_size = get_library_size_for_derived_sample(sample_obj.derived_sample_not_pool.id)

        self.assertEqual(library_size, 100)