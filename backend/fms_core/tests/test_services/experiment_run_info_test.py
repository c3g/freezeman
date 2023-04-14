from pathlib import Path
from os.path import exists
from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
from fms_core.services.experiment_run import start_experiment_run_processing, get_run_info_for_experiment
from fms_core.template_importer.importers import (
    SampleSubmissionImporter,
    LibraryPreparationImporter,
    SamplePoolingImporter,
    IndexCreationImporter,
    LibraryQCImporter,
    LibraryCaptureImporter,
    ExperimentRunImporter
    )
from fms_core.services.experiment_run_info import generate_run_info
from fms_core.tests.test_template_importers._utils import load_template
from fms_core.services.project import create_project

from fms_core.models import Biosample, ExperimentRun, IndexSet, Index

from fms_core.tests.constants import create_container
from fms_core.services import experiment_run, sample
from datetime import datetime


TEMPLATES_DIR = Path(__file__).parent.parent / "service-templates"

PROJECT_NAME = 'TEST_PROJECT'
EXTERNAL_PROJECT_ID = 'HERCULES_ID'
EXTERNAL_PROJECT_NAME = 'HERCULES'

class ExperimentRunInfoTemplatesTestCase(TestCase):
    def setUp(self) -> None:

        ContentType.objects.clear_cache()

        self.project, _, _ = create_project(name=PROJECT_NAME)
        self.project.external_name = EXTERNAL_PROJECT_NAME
        self.project.external_id = EXTERNAL_PROJECT_ID
        self.project.save()

        self.import_template(IndexCreationImporter(), 'Index_creation_v3_7_0.xlsx')

        self.import_template(SampleSubmissionImporter(), 'Sample_submission_v4_1_0.xlsx')
        
        self.import_template(LibraryPreparationImporter(), 'Library_preparation_v4_1_0.xlsx')

        self.import_template(LibraryQCImporter(), 'Library_QC_v4_1_0.xlsx')
        
        self.import_template(SamplePoolingImporter(), 'Sample_pooling_v4_2_0.xlsx')

        self.import_template(LibraryCaptureImporter(), 'Library_capture_v4_1_0.xlsx')

        # MGI Experiment
        self.import_template(ExperimentRunImporter(), 'Experiment_run_MGI_v4_1_0.xlsx')

        # Illumina Experiment
        self.import_template(ExperimentRunImporter(), 'Experiment_run_illumina_v4_1_0.xlsx')
       

    def import_template(self, importer, file):
        template_path = TEMPLATES_DIR / file
        result = load_template(importer=importer, file=template_path)
        if result['valid'] == False:
            raise Exception(f'Failed to import template {file}')


    def test_mgi_experiment_run(self):
        mgi_experiment = ExperimentRun.objects.get(name='ER-RNA-MGI-EXPERIMENT')
        self.assertIsNotNone(mgi_experiment)
        
        run_info = generate_run_info(mgi_experiment)

        self.assertIsNotNone(run_info)
        self.assertEqual(run_info['version'], '1.0.0')
        self.assertEqual(run_info['run_name'], 'ER-RNA-MGI-EXPERIMENT')
        self.assertEqual(run_info['run_obj_id'], mgi_experiment.id)
        self.assertEqual(run_info['run_start_date'],  mgi_experiment.start_date.strftime("%Y-%m-%d"))
        self.assertEqual(run_info['container_obj_id'], mgi_experiment.container.id)
        self.assertEqual(run_info['container_barcode'], mgi_experiment.container.barcode)
        self.assertEqual(run_info['platform'], mgi_experiment.instrument.type.platform.name)
        self.assertEqual(run_info['instrument_serial_number'], mgi_experiment.instrument.serial_id)
        self.assertEqual(run_info['instrument_type'], mgi_experiment.instrument.type.type)

        self.assertEqual(len(run_info['samples']), 2)

        sample_index = [index for (index, sample) in enumerate(run_info['samples']) if sample['sample_name'] == 'ER_AliasRNA1'][0]
        run_info_sample = run_info['samples'][sample_index]

        expected_values = dict(
            pool_name = "ER_Pooled_RNA",
            sample_name= "ER_AliasRNA1",
            biosample_obj_id= Biosample.objects.get(alias='ER_AliasRNA1').id,
            container_coordinates= "A01",
            lane= 1,
            project_obj_id= self.project.id,
            project_name= PROJECT_NAME,
            hercules_project_id= EXTERNAL_PROJECT_ID,
            hercules_project_name= EXTERNAL_PROJECT_NAME,
            pool_volume_ratio= 0.5,
            expected_sex= "M",
            ncbi_taxon_id= 9606,
            taxon_name= "Homo sapiens",
            library_type= "miRNA",
            library_size= 500,
            index_set_obj_id= IndexSet.objects.get(name='_10x_Genomics_scRNA_V1').id,
            index_set_name= "_10x_Genomics_scRNA_V1",
            index_obj_id= Index.objects.get(name='SI-3A-A1').id,
            index_name= "SI-3A-A1",
            index_sequence_3_prime= [
                ""
            ],
            index_sequence_5_prime= [
                "AAACGGCG",
                "CCTACCAT",
                "GGCGTTTC",
                "TTGTAAGA"
            ],
            library_kit= "miRNA NEBNext",
            capture_kit= "MCC-Seq",
            capture_baits= "MCC-Seq ImmuneV2 (ImmuneV3B)",
            chip_seq_mark= None
        )

        self.assert_sample(run_info_sample, expected_values)
        # It would be complicated to find the derived sample instance that generated a given
        # run info sample, so I'm cheating here and just making sure that an id value was output.
        self.assertIsNotNone(run_info_sample['derived_sample_obj_id'])
       
    def assert_sample(self, run_info_sample, values_dict):
        for key in values_dict:
            self.assertEqual(run_info_sample[key], values_dict[key])

    def test_illumina_experiment_run(self):
        # This test just verifies that an illumina experiment run can be processed.
        illumina_experiment = ExperimentRun.objects.get(name='ER-DNA-ILLUMINA-EXPERIMENT')
        self.assertIsNotNone(illumina_experiment)
        
        run_info = generate_run_info(illumina_experiment)

        self.assertIsNotNone(run_info)

    def test_service_start_experiment_run_processing(self):
        # Just verify that no exception is thrown
        mgi_experiment = ExperimentRun.objects.get(name='ER-RNA-MGI-EXPERIMENT')
        event_file, errors, warnings = start_experiment_run_processing(mgi_experiment.id)
        
        self.assertTrue(exists(event_file))
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_service_get_run_info_for_experiment(self):
        # Just verify that no exception is thrown
        mgi_experiment = ExperimentRun.objects.get(name='ER-RNA-MGI-EXPERIMENT')
        info, errors, warnings = get_run_info_for_experiment(mgi_experiment.id)

        self.assertIsNotNone(info)
        self.assertFalse(errors)
        self.assertFalse(warnings)
