import reversion
from decimal import Decimal
import datetime
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.db import IntegrityError, transaction
from django.test import TestCase
from pathlib import Path
from reversion.models import Version
from tablib import Dataset

from django.contrib.contenttypes.models import ContentType
from ..models import Container, Sample, ExtractedSample, Individual, ProcessMeasurement, SampleLineage, Process, ExperimentRun, PropertyType, PropertyValue, Project, SampleByProject
from ..resources import (
    ContainerResource,
    ExtractionResource,
    TransferResource,
    ExperimentRunResource,
    ContainerMoveResource,
    ContainerRenameResource,
    SampleResource,
    SampleUpdateResource,
    ProjectLinkSampleResource,
)
# noinspection PyProtectedMember
from ..resources._utils import skip_rows


def get_ds():
    ds = Dataset(headers=["bad 0", "bad 1", "bad 2", "bad 3"])
    ds.extend((
        ("", "", "", ""),
        ("#", "good 1", "good 2", "good 3"),
        ("1", "v1", "v2", "v3"),
        ("", "", "", ""),
    ))
    return ds


CSV_1 = """#,good 1,good 2,good 3
1,v1,v2,v3
"""


APP_DATA_ROOT = Path(__file__).parent / "valid_templates"
TEST_DATA_ROOT = Path(__file__).parent / "invalid_templates"

CONTAINER_CREATION_CSV = APP_DATA_ROOT / "Container_creation_v3_2_0_B_A_1.csv"
CONTAINER_MOVE_CSV = APP_DATA_ROOT / "Container_move_v3_2_0_B_A_1.csv"
CONTAINER_RENAME_CSV = APP_DATA_ROOT / "Container_rename_v3_2_0_B_A_1.csv"
SAMPLE_EXTRACTION_CSV = APP_DATA_ROOT / "Sample_extraction_v3_3_0_B_A_1.csv"
SAMPLE_TRANSFER_CSV = APP_DATA_ROOT / "Sample_transfer_v3_2_0_B_A_1.csv"
SAMPLE_SUBMISSION_CSV = APP_DATA_ROOT / "Sample_submission_v3_4_0_B_A_1.csv"
SAMPLE_UPDATE_CSV = APP_DATA_ROOT / "Sample_update_v3_2_0_B_A_1.csv"
PROJECT_LINK_SAMPLES_CSV = APP_DATA_ROOT / "Project_link_samples_v3_4_0_B_A_1.csv"
PROJECT_UNLINK_SAMPLES_CSV = APP_DATA_ROOT / "Project_link_samples_v3_4_0_B_B_1.csv"
EXPERIMENT_INFINIUM_CSV = APP_DATA_ROOT / "Experiment_Infinium_24_v3_4_0_B_A_1.csv"


class ResourcesTestCase(TestCase):
    def setUp(self) -> None:
        ContentType.objects.clear_cache()

        self.cr = ContainerResource()
        self.sr = SampleResource()
        self.er = ExtractionResource()
        self.st = TransferResource()
        self.err = ExperimentRunResource()
        self.ur = SampleUpdateResource()
        self.mr = ContainerMoveResource()
        self.rr = ContainerRenameResource()
        self.pr = ProjectLinkSampleResource()

    def create_projects(self):
        self.project1, _ = Project.objects.get_or_create(name="TestProject1", status="Ongoing")
        self.project2, _ = Project.objects.get_or_create(name="TestProject2", status="Ongoing")

    def load_containers(self):
        with reversion.create_revision(), open(CONTAINER_CREATION_CSV) as cf:
            c = Dataset().load(cf.read())
            self.cr.import_data(c, raise_errors=True)

            reversion.set_comment("Loaded containers")

    def load_samples(self):
        self.load_containers()
        self.create_projects()

        with reversion.create_revision(), open(SAMPLE_SUBMISSION_CSV) as sf:
            s = Dataset().load(sf.read())
            self.sr.import_data(s, raise_errors=True)

            reversion.set_comment("Loaded samples")

    def load_extractions(self):
        with reversion.create_revision(), open(SAMPLE_EXTRACTION_CSV) as ef:
            e = Dataset().load(ef.read())
            self.er.import_data(e, raise_errors=True)

            reversion.set_comment("Loaded extractions")

    def load_transfers(self):
        with reversion.create_revision(), open(SAMPLE_TRANSFER_CSV) as ef:
            e = Dataset().load(ef.read())
            self.st.import_data(e, raise_errors=True)
            reversion.set_comment("Loaded transfers")
    
    def load_experiments_infinium(self):
        with reversion.create_revision(), open(EXPERIMENT_INFINIUM_CSV) as ef:
            e = Dataset().load(ef.read())
            self.err.import_data(e, raise_errors=True)
            reversion.set_comment("Loaded Experiment Run Infinium")

    def link_projects_to_samples(self):
        with reversion.create_revision(), open(PROJECT_LINK_SAMPLES_CSV) as sf:
            s = Dataset().load(sf.read())
            self.pr.import_data(s, raise_errors=True)

            reversion.set_comment("Linked projects with samples")

    def load_samples_extractions(self):
        self.load_samples()
        self.load_containers()
        self.load_extractions()

    def load_samples_transfers(self):
        self.load_samples()
        self.load_containers()
        self.load_transfers()

    def load_samples_experiments_infinium(self):
        self.load_samples()
        self.link_projects_to_samples()
        self.load_experiments_infinium()

    def test_skip_rows(self):
        ds = get_ds()
        old_csv = ds.export("csv")

        skip_rows(ds, num_rows=0)
        self.assertEqual(ds.export("csv"), old_csv)

        skip_rows(ds, num_rows=2, col_skip=1)
        self.assertEqual(ds.export("csv").replace("\r", ""), CSV_1)

    def test_container_import(self):
        self.load_containers()
        self.assertEqual(len(Container.objects.all()), 6)

    def test_sample_import(self):
        self.load_samples()

        # Test basic import success
        self.assertEqual(len(Sample.objects.all()), 13)
        self.assertEqual(len(Individual.objects.all()), 7)  # 4 individuals plus 2 parents for DL

        # Test parent record auto-generation
        i = Individual.objects.get(name="David Lougheed")
        self.assertEqual(i.sex, Individual.SEX_MALE)
        self.assertEqual(i.father.sex, Individual.SEX_MALE)
        self.assertEqual(i.mother.sex, Individual.SEX_FEMALE)
        self.assertEqual(i.pedigree, i.mother.pedigree)
        self.assertEqual(i.cohort, i.mother.cohort)
        self.assertEqual(i.pedigree, i.father.pedigree)
        self.assertEqual(i.cohort, i.father.cohort)

    def test_invalid_sample_import(self):
        self.load_containers()

        # noinspection PyTypeChecker
        with self.assertRaises(ValidationError), open(TEST_DATA_ROOT / "Sample_submission_v3_4_0_bad_location.csv") as sf:
            s = Dataset().load(sf.read())
            self.sr.import_data(s, raise_errors=True)

    def test_no_conc_dna_import(self):
        self.load_containers()

        # noinspection PyTypeChecker
        with self.assertRaises(ValidationError), open(TEST_DATA_ROOT / "Sample_submission_v3_4_0_dna_no_conc.csv") as sf:
            s = Dataset().load(sf.read())
            try:
                self.sr.import_data(s, raise_errors=True)
            except ValidationError as e:
                self.assertDictEqual(
                    e.message_dict,
                    {'concentration': ['Concentration must be specified if the sample_kind is DNA']})
                raise e

    def test_link_projects_to_samples_import(self):
        self.load_samples()
        self.link_projects_to_samples()
        sample1 = Sample.objects.get(name="sample1", container__barcode="tube001")
        sample2 = Sample.objects.get(name="sample2", container__barcode="tube002")

        # Test basic import success
        self.assertEqual(len(SampleByProject.objects.all()), 11)

        # Test parent record auto-generation
        self.assertTrue(SampleByProject.objects.filter(sample=sample1, project=self.project1).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=sample1, project=self.project2).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=sample2, project=self.project2).exists())

    def unlink_projects_to_samples(self):
        self.link_projects_to_samples()
        with reversion.create_revision(), open(PROJECT_UNLINK_SAMPLES_CSV) as sf:
            s = Dataset().load(sf.read())
            self.pr.import_data(s, raise_errors=True)

            reversion.set_comment("Unlinked projects with samples")

    def test_unlink_projects_to_samples_import(self):
        self.load_samples()
        self.unlink_projects_to_samples()
        sample1 = Sample.objects.get(name="sample1", container__barcode="tube001")
        sample2 = Sample.objects.get(name="sample2", container__barcode="tube002")

        # Test basic import success
        self.assertEqual(len(SampleByProject.objects.all()), 10)

        # Test parent record auto-generation
        self.assertFalse(SampleByProject.objects.filter(sample=sample1, project=self.project1).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=sample1, project=self.project2).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=sample2, project=self.project2).exists())

    def test_invalid_link_project_sample(self):
        self.load_samples()

        with self.assertRaises(ObjectDoesNotExist), open(TEST_DATA_ROOT / "Project_link_samples_invalid_project_and_sample.csv") as sf:
            s = Dataset().load(sf.read())
            self.pr.import_data(s, raise_errors=True)

    def test_sample_extraction_import(self):
        self.load_samples_extractions()

        self.assertEqual(len(Sample.objects.all()), 16)
        self.assertEqual(len(ExtractedSample.objects.all()), 3)

    def test_sample_extracted_from_version_count(self):
        self.load_samples()

        s = Sample.objects.get(container__barcode="tube001")
        vs = Version.objects.filter(object_id=str(s.id), content_type__model="sample").count()
        self.assertEqual(vs, 1)

        self.load_extractions()

        vs = Version.objects.filter(object_id=str(s.id), content_type__model="sample").count()
        self.assertEqual(vs, 2)

    def test_first_sample_extraction_import(self):
        self.load_samples_extractions()
        # Test first extraction
        s = Sample.objects.get(container__barcode="tube003")
        sl = SampleLineage.objects.get(parent=s.extracted_from, child=s)
        ps = ProcessMeasurement.objects.get(source_sample_id=s.extracted_from.id, lineage=sl)
        self.assertEqual(sl.process_measurement_id, ps.id)
        self.assertEqual('Extraction', ps.process.protocol.name)
        self.assertEqual(s.extracted_from.volume, Decimal("7.000"))
        self.assertFalse(s.extracted_from.depleted)

    def test_second_sample_extraction_import(self):
        self.load_samples_extractions()
        # Test second extraction
        s = Sample.objects.get(container__barcode="tube004")
        sl = SampleLineage.objects.get(parent=s.extracted_from, child=s)
        ps = ProcessMeasurement.objects.get(source_sample_id=s.extracted_from.id, lineage=sl)
        self.assertEqual(sl.process_measurement_id, ps.id)
        self.assertEqual('Extraction', ps.process.protocol.name)
        self.assertEqual(s.extracted_from.volume, Decimal("0.000"))
        self.assertTrue(s.extracted_from.depleted)

    def test_third_sample_extraction_import(self):
        self.load_samples_extractions()
        # Test third extraction
        s = Sample.objects.get(container__barcode="plate002", coordinates="C04")
        sl = SampleLineage.objects.get(parent=s.extracted_from, child=s)
        ps = ProcessMeasurement.objects.get(source_sample_id=s.extracted_from.id, lineage=sl)
        self.assertEqual(sl.process_measurement_id, ps.id)
        self.assertEqual('Extraction', ps.process.protocol.name)
        self.assertEqual(s.extracted_from.volume, Decimal("7.000"))
        self.assertFalse(s.extracted_from.depleted)

    def test_sample_extractions_mapped_to_one_process(self):
        self.load_samples_extractions()
        s1 = Sample.objects.get(container__barcode="tube003")
        sl1 = SampleLineage.objects.get(parent=s1.extracted_from, child=s1)
        ps1 = ProcessMeasurement.objects.get(source_sample_id=s1.extracted_from.id, lineage=sl1)
        s2 = Sample.objects.get(container__barcode="tube004")
        sl2 = SampleLineage.objects.get(parent=s2.extracted_from, child=s2)
        ps2 = ProcessMeasurement.objects.get(source_sample_id=s2.extracted_from.id, lineage=sl2)
        self.assertEqual(ps1.process.id, ps2.process.id)

    def test_sample_extractions_project_heritage(self):
        self.load_samples()
        self.load_containers()
        self.link_projects_to_samples()
        self.load_extractions()
        s1 = Sample.objects.get(container__barcode="tube003")
        s2 = Sample.objects.get(container__barcode="tube004")
        s3 = Sample.objects.get(container__barcode="plate002", coordinates="C04")

        self.assertTrue(SampleByProject.objects.filter(sample=s1, project=self.project1).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=s1, project=self.project2).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=s2, project=self.project2).exists())
        self.assertFalse(SampleByProject.objects.filter(sample=s2, project=self.project1).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=s3, project=self.project1).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=s3, project=self.project2).exists())

    def test_sample_transfer_to_new_container_import(self):
        self.load_samples_transfers()
        s = Sample.objects.get(container__barcode="newtubefortransfer")
        sl = SampleLineage.objects.get(parent=s.transferred_from, child=s)
        ps = ProcessMeasurement.objects.get(source_sample_id=s.transferred_from.id)
        self.assertEqual(sl.process_measurement_id, ps.id)
        self.assertEqual(ps.process.protocol.name, 'Transfer')
        self.assertEqual(s.volume, Decimal("10.000"))
        self.assertEqual(s.transferred_from.volume, Decimal("0"))

    def test_sample_transfer_to_existing_container(self):
        self.load_samples_transfers()
        s = Sample.objects.get(container__barcode="plate001", coordinates="B01")
        sl = SampleLineage.objects.get(parent=s.transferred_from, child=s)
        ps = ProcessMeasurement.objects.get(source_sample_id=s.transferred_from.id)
        self.assertEqual(sl.process_measurement_id, ps.id)
        self.assertEqual(ps.process.protocol.name, 'Transfer')
        self.assertEqual(s.volume, Decimal("2.000"))
        self.assertEqual(s.transferred_from.volume, Decimal("13"))

    def test_sample_transfers_mapped_to_one_process(self):
        self.load_samples_transfers()
        s1 = Sample.objects.get(container__barcode="newtubefortransfer")
        ps1 = ProcessMeasurement.objects.get(source_sample_id=s1.transferred_from.id)
        s2 = Sample.objects.get(container__barcode="plate001", coordinates="B01")
        ps2 = ProcessMeasurement.objects.get(source_sample_id=s2.transferred_from.id)
        self.assertEqual(ps1.process.id, ps2.process.id)

    def test_sample_transfers_project_heritage(self):
        self.load_samples()
        self.load_containers()
        self.link_projects_to_samples()
        self.load_transfers()
        s1 = Sample.objects.get(container__barcode="newtubefortransfer")
        s2 = Sample.objects.get(container__barcode="plate001", coordinates="B01")

        self.assertTrue(SampleByProject.objects.filter(sample=s1, project=self.project1).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=s1, project=self.project2).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=s2, project=self.project2).exists())
        self.assertFalse(SampleByProject.objects.filter(sample=s2, project=self.project1).exists())

    def test_experiment_run_infinium_import(self):
        self.load_samples_experiments_infinium()

        content_type_process = ContentType.objects.get_for_model(Process)
        # Test first experiment run
        er1 = ExperimentRun.objects.get(container__barcode="XPBARCODE1")
        p1 = Process.objects.get(experiment_runs=er1)
        c1 = Container.objects.get(barcode="XPBARCODE1")
        # Experiment Run tests
        self.assertEqual(er1.experiment_type.workflow, 'Infinium Global Screening Array-24')
        self.assertEqual(er1.instrument.name, 'iScan_1')
        self.assertEqual(er1.start_date, datetime.date(2021,7,13))
        # Process Tests
        self.assertEqual(p1.child_process.count(), 7)
        self.assertEqual(p1.protocol.name, 'Illumina Infinium Preparation')
        # Sub-process Tests (check properties for one process and sub-processes in depth)
        cp1_1 = Process.objects.get(parent_process=p1, protocol__name='Infinium: Amplification')
        cp1_1_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id, property_type=PropertyType.objects.get(name='MSA3 Plate Barcode'))
        cp1_1_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id, property_type__name='0.1N NaOH formulation date')
        cp1_1_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id, property_type__name='Reagent MA1 Barcode')
        cp1_1_p4 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id, property_type__name='Reagent MA2 Barcode')
        cp1_1_p5 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id, property_type__name='Reagent MSM Barcode')
        cp1_1_p6 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id, property_type__name='Incubation time In Amplification')
        cp1_1_p7 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id, property_type__name='Incubation time Out Amplification')
        cp1_1_p8 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_1.id, property_type__name='Comment Amplification')
        # Check property values for Amplification sub-process
        self.assertEqual(cp1_1_p1.value, 'plate01')
        self.assertEqual(cp1_1_p2.value, '2021-06-13')
        self.assertEqual(cp1_1_p3.value, 'MA1_1')
        self.assertEqual(cp1_1_p4.value, 'MA2_1')
        self.assertEqual(cp1_1_p5.value, 'MSM_1')
        self.assertEqual(cp1_1_p6.value, '15:00')
        self.assertEqual(cp1_1_p7.value, '15:30')
        self.assertEqual(cp1_1_p8.value, 'Comment 1')

        cp1_2 = Process.objects.get(parent_process=p1, protocol__name='Infinium: Fragmentation')
        cp1_2_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_2.id, property_type__name='Reagent FMS Barcode')
        cp1_2_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_2.id, property_type__name='Comment Fragmentation')
        # Check property values for Fragmentation sub-process
        self.assertEqual(cp1_2_p1.value, 'FMS_1')
        self.assertEqual(cp1_2_p2.value, 'Comment 5')
        
        cp1_3 = Process.objects.get(parent_process=p1, protocol__name='Infinium: Precipitation')
        cp1_3_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_3.id, property_type__name='Reagent PM1 Barcode')
        cp1_3_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_3.id, property_type__name='Reagent RA1 Barcode Precipitation')
        cp1_3_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_3.id, property_type__name='Comment Precipitation')
        # Check property values for Precipitation sub-process
        self.assertEqual(cp1_3_p1.value, 'PM1_1')
        self.assertEqual(cp1_3_p2.value, 'RA1_P_1')
        self.assertEqual(cp1_3_p3.value, 'Comment 9')
        
        cp1_4 = Process.objects.get(parent_process=p1, protocol__name='Infinium: Hybridization')
        cp1_4_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id, property_type__name='Hybridization Chip Barcodes')
        cp1_4_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id, property_type__name='Hybridization Chamber Barcode')
        cp1_4_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id, property_type__name='Reagent PB2 Barcode')
        cp1_4_p4 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id, property_type__name='Reagent XC4 Barcode Hybridization')
        cp1_4_p5 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id, property_type__name='Incubation time In Hybridization')
        cp1_4_p6 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id, property_type__name='Incubation time Out Hybridization')
        cp1_4_p7 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_4.id, property_type__name='Comment Hybridization')
        # Check property values for Hybridization sub-process
        self.assertEqual(cp1_4_p1.value, 'H_CHIP_1')
        self.assertEqual(cp1_4_p2.value, 'H_CHAMBER_1')
        self.assertEqual(cp1_4_p3.value, 'PB2_1')
        self.assertEqual(cp1_4_p4.value, 'XC4_H_1')
        self.assertEqual(cp1_4_p5.value, '03:00')
        self.assertEqual(cp1_4_p6.value, '03:15')
        self.assertEqual(cp1_4_p7.value, 'Comment 13')

        cp1_5 = Process.objects.get(parent_process=p1, protocol__name='Infinium: Wash Beadchip')
        cp1_5_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_5.id, property_type__name='Reagent PB1 Barcode Wash')
        cp1_5_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_5.id, property_type__name='Comment Wash')
        # Check property values for Wash Beadchip sub-process
        self.assertEqual(cp1_5_p1.value, 'PB1_W_1')
        self.assertEqual(cp1_5_p2.value, 'Comment 17')

        cp1_6 = Process.objects.get(parent_process=p1, protocol__name='Infinium: Extend and Stain')
        cp1_6_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='95% form/EDTA')
        cp1_6_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='Reagent ATM Barcode')
        cp1_6_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='Reagent EML Barcode')
        cp1_6_p4 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='Reagent LX1 Barcode')
        cp1_6_p5 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='Reagent LX2 Barcode')
        cp1_6_p6 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='Reagent PB1 Barcode Stain')
        cp1_6_p7 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='Reagent RA1 Barcode Stain')
        cp1_6_p8 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='Reagent SML Barcode')
        cp1_6_p9 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='Reagent XC3 Barcode')
        cp1_6_p10 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='Reagent XC4 Barcode Stain')
        cp1_6_p11 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_6.id, property_type__name='Comment Stain')
        # Check property values for Extend and Stain sub-process
        self.assertEqual(cp1_6_p1.value, 'EDTA_1')
        self.assertEqual(cp1_6_p2.value, 'ATM_1')
        self.assertEqual(cp1_6_p3.value, 'EML_1')
        self.assertEqual(cp1_6_p4.value, 'LX1_1')
        self.assertEqual(cp1_6_p5.value, 'LX2_1')
        self.assertEqual(cp1_6_p6.value, 'PB1_S_1')
        self.assertEqual(cp1_6_p7.value, 'RA1_S_1')
        self.assertEqual(cp1_6_p8.value, 'SML_1')
        self.assertEqual(cp1_6_p9.value, 'XC3_1')
        self.assertEqual(cp1_6_p10.value, 'XC4_S_1')
        self.assertEqual(cp1_6_p11.value, 'Comment 21')

        cp1_7 = Process.objects.get(parent_process=p1, protocol__name='Infinium: Scan Preparation')
        cp1_7_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_7.id, property_type__name='SentrixBarcode_A')
        cp1_7_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_7.id, property_type__name='Scan Chip Rack Barcode')
        cp1_7_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp1_7.id, property_type__name='Comment Scan')
        # Check property values for Scan Preparation sub-process
        self.assertEqual(cp1_7_p1.value, 'XPBARCODE1')
        self.assertEqual(cp1_7_p2.value, 'CHIP_RACK_1')
        self.assertEqual(cp1_7_p3.value, 'Comment 25')
        # Tests related to first sample
        ss1 = Sample.objects.get(container__barcode="Infinium001", coordinates="A01")
        pm1 = ProcessMeasurement.objects.get(process=p1, source_sample=ss1)
        sl1 = SampleLineage.objects.get(process_measurement=pm1)
      
        self.assertEqual(pm1.volume_used, Decimal(200))
      
        se1 = sl1.child
        self.assertEqual(ss1, sl1.parent) # Source sample of the ProcessMeasurement is the same as parent sample of lineage
        self.assertTrue(ss1.is_depleted) # We used all Volume from sample source
        self.assertTrue(se1.is_depleted) # Samples used in an experiment run are depleted by default
        self.assertEqual(se1.volume, Decimal("0")) # Samples used in an experiment have volume set to 0
        self.assertEqual(se1.container, c1) # Child Sample is in the experimental container XPBARCODE1
        self.assertTrue(SampleByProject.objects.filter(sample=se1, project=self.project1).exists())
        # Tests related to second sample
        ss2 = Sample.objects.get(container__barcode="Infinium001", coordinates="A05")
        pm2 = ProcessMeasurement.objects.get(process=p1, source_sample=ss2)
        sl2 = SampleLineage.objects.get(process_measurement=pm2)
      
        self.assertEqual(pm2.volume_used, Decimal(21))
      
        se2 = sl2.child
        self.assertEqual(ss2, sl2.parent) # Source sample of the ProcessMeasurement is the same as parent sample of lineage
        self.assertTrue(se2.is_depleted) # Samples used in an experiment run are depleted by default
        self.assertEqual(se2.volume, Decimal("0")) # Samples used in an experiment have volume set to 0  
        self.assertEqual(se2.container, c1) # Child Sample is in the experimental container XPBARCODE1
        self.assertTrue(SampleByProject.objects.filter(sample=se2, project=self.project1).exists())
        # Tests related to third sample
        ss3 = Sample.objects.get(container__barcode="Infinium001", coordinates="C10")
        pm3 = ProcessMeasurement.objects.get(process=p1, source_sample=ss3)
        sl3 = SampleLineage.objects.get(process_measurement=pm3)
      
        self.assertEqual(pm3.volume_used, Decimal(22))
      
        se3 = sl3.child
        self.assertEqual(ss3, sl3.parent) # Source sample of the ProcessMeasurement is the same as parent sample of lineage
        self.assertTrue(se3.is_depleted) # Samples used in an experiment run are depleted by default
        self.assertEqual(se3.volume, Decimal("0")) # Samples used in an experiment have volume set to 0  
        self.assertEqual(se3.container, c1) # Child Sample is in the experimental container XPBARCODE1
        self.assertTrue(SampleByProject.objects.filter(sample=se3, project=self.project1).exists())
        # Tests related to fourth sample
        ss4 = Sample.objects.get(container__barcode="Infinium001", coordinates="D01")
        pm4 = ProcessMeasurement.objects.get(process=p1, source_sample=ss4)
        sl4 = SampleLineage.objects.get(process_measurement=pm4)
      
        self.assertEqual(pm4.volume_used, Decimal(23))
      
        se4 = sl4.child
        self.assertEqual(ss4, sl4.parent) # Source sample of the ProcessMeasurement is the same as parent sample of lineage
        self.assertTrue(se4.is_depleted) # Samples used in an experiment run are depleted by default
        self.assertEqual(se4.volume, Decimal("0")) # Samples used in an experiment have volume set to 0  
        self.assertEqual(se4.container, c1) # Child Sample is in the experimental container XPBARCODE1
        self.assertTrue(SampleByProject.objects.filter(sample=se4, project=self.project1).exists())

        # Test second experiment run
        er2 = ExperimentRun.objects.get(container__barcode="XPBARCODE2")
        p2 = Process.objects.get(experiment_runs=er2)
        c2 = Container.objects.get(barcode="XPBARCODE2")
        # Experiment Run tests
        self.assertEqual(er2.experiment_type.workflow, 'Infinium Global Screening Array-24')
        self.assertEqual(er2.instrument.name, 'iScan_1')
        self.assertEqual(er2.start_date, datetime.date(2021,7,13))
        # Process Tests
        self.assertEqual(p2.child_process.count(), 7)
        self.assertEqual(p2.protocol.name, 'Illumina Infinium Preparation')
         # Tests related to sixth sample (from a tube)
        ss6 = Sample.objects.get(container__barcode="tube005")
        pm6 = ProcessMeasurement.objects.get(process=p2, source_sample=ss6)
        sl6 = SampleLineage.objects.get(process_measurement=pm6)
      
        self.assertEqual(pm6.volume_used, Decimal(25))
      
        se6= sl6.child
        self.assertEqual(ss6, sl6.parent) # Source sample of the ProcessMeasurement is the same as parent sample of lineage
        self.assertTrue(se6.is_depleted) # Samples used in an experiment run are depleted by default
        self.assertEqual(se6.volume, Decimal("0")) # Samples used in an experiment have volume set to 0  
        self.assertEqual(se6.container, c2) # Child Sample is in the experimental container XPBARCODE2
        self.assertFalse(SampleByProject.objects.filter(sample=se6, project=self.project1).exists())
        self.assertFalse(SampleByProject.objects.filter(sample=se6, project=self.project2).exists())


        # Test third experiment run
        er3 = ExperimentRun.objects.get(container__barcode="XPBARCODE3")
        p3 = Process.objects.get(experiment_runs=er3)
        c3 = Container.objects.get(barcode="XPBARCODE3")
        # Experiment Run tests
        self.assertEqual(er3.experiment_type.workflow, 'Infinium Global Screening Array-24')
        self.assertEqual(er3.instrument.name, 'iScan_1')
        self.assertEqual(er3.start_date, datetime.date(2021,7,13))
        # Process Tests
        self.assertEqual(p3.child_process.count(), 7)
        self.assertEqual(p3.protocol.name, 'Illumina Infinium Preparation')
         # Tests related to seventh sample
        ss7 = Sample.objects.get(container__barcode="Infinium003", coordinates="E01")
        pm7 = ProcessMeasurement.objects.get(process=p3, source_sample=ss7)
        sl7 = SampleLineage.objects.get(process_measurement=pm7)
      
        self.assertEqual(pm7.volume_used, Decimal(26))
      
        se7= sl7.child
        self.assertEqual(ss7, sl7.parent) # Source sample of the ProcessMeasurement is the same as parent sample of lineage
        self.assertTrue(se7.is_depleted) # Samples used in an experiment run are depleted by default
        self.assertEqual(se7.volume, Decimal("0")) # Samples used in an experiment have volume set to 0  
        self.assertEqual(se7.container, c3) # Child Sample is in the experimental container XPBARCODE3
        self.assertTrue(SampleByProject.objects.filter(sample=se7, project=self.project1).exists())
        self.assertTrue(SampleByProject.objects.filter(sample=se7, project=self.project2).exists())

        # Test fourth experiment run
        er4 = ExperimentRun.objects.get(container__barcode="XPBARCODE4")
        p4 = Process.objects.get(experiment_runs=er4)
        c4 = Container.objects.get(barcode="XPBARCODE4")
        # Experiment Run tests
        self.assertEqual(er4.experiment_type.workflow, 'Infinium Global Screening Array-24')
        self.assertEqual(er4.instrument.name, 'iScan_1')
        self.assertEqual(er4.start_date, datetime.date(2021,7,13))
        # Process Tests
        self.assertEqual(p4.child_process.count(), 7)
        self.assertEqual(p4.protocol.name, 'Illumina Infinium Preparation')

        cp4_7 = Process.objects.get(parent_process=p4, protocol__name='Infinium: Scan Preparation')
        cp4_7_p1 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp4_7.id, property_type__name='SentrixBarcode_A')
        cp4_7_p2 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp4_7.id, property_type__name='Scan Chip Rack Barcode')
        cp4_7_p3 = PropertyValue.objects.get(content_type=content_type_process, object_id=cp4_7.id, property_type__name='Comment Scan')
        # Check property values for Scan Preparation sub-process
        self.assertEqual(cp4_7_p1.value, 'XPBARCODE4')
        self.assertEqual(cp4_7_p2.value, 'CHIP_RACK_1')
        self.assertEqual(cp4_7_p3.value, '')
         # Tests related to ninth sample
        ss9 = Sample.objects.get(container__barcode="Infinium003", coordinates="H12")
        pm9 = ProcessMeasurement.objects.get(process=p4, source_sample=ss9)
        sl9 = SampleLineage.objects.get(process_measurement=pm9)
      
        self.assertEqual(pm9.volume_used, Decimal(28))
      
        se9= sl9.child
        self.assertEqual(ss9, sl9.parent) # Source sample of the ProcessMeasurement is the same as parent sample of lineage
        self.assertTrue(se9.is_depleted) # Samples used in an experiment run are depleted by default
        self.assertEqual(se9.volume, Decimal("0")) # Samples used in an experiment have volume set to 0  
        self.assertEqual(se9.container, c4) # Child Sample is in the experimental container XPBARCODE4
        self.assertTrue(SampleByProject.objects.filter(sample=se9, project=self.project2).exists())


    def test_sample_update(self):
        self.load_samples()

        s = Sample.objects.get(container__barcode="tube005")
        vs = Version.objects.filter(object_id=str(s.id), content_type__model="sample").count()
        self.assertEqual(vs, 1)

        with reversion.create_revision(), open(SAMPLE_UPDATE_CSV) as uf:
            u = Dataset().load(uf.read())
            self.ur.import_data(u, raise_errors=True)

            reversion.set_comment("Updated samples")

        s.refresh_from_db()
        vs = Version.objects.filter(object_id=str(s.id), content_type__model="sample").count()
        self.assertEqual(vs, 2)

        self.assertEqual(s.coordinates, "")
        self.assertEqual(s.volume, Decimal("0.001"))
        self.assertEqual(s.concentration, Decimal("8.5"))
        self.assertFalse(s.depleted)
        self.assertEqual(s.comment, "some fourth comment here")
        self.assertEqual(s.update_comment, "sample 4 updated")

        s1 = Sample.objects.get(container__barcode="tube001")
        ps1 = ProcessMeasurement.objects.get(source_sample_id=s1.id)
        self.assertEqual(ps1.process.protocol.name, 'Update')
        self.assertTrue(s1.depleted)
        self.assertEqual(s1.update_comment, "sample 1 depleted")

        s2 = Sample.objects.get(container__barcode="plate001", coordinates="A01")
        ps2 = ProcessMeasurement.objects.get(source_sample_id=s2.id)
        self.assertEqual(ps2.process.protocol.name, 'Update')
        self.assertEqual(s2.volume, Decimal("0.1"))
        self.assertEqual(s2.concentration, Decimal("0.2"))
        self.assertFalse(s2.depleted)
        self.assertEqual(s2.update_comment, "sample 3 updated")

        # Test updates are part of the same process
        self.assertEqual(ps1.process.id, ps2.process.id)

        # TODO: Test leaving coordinate blank not updating container coordinate

    def test_container_move(self):
        self.load_containers()

        with reversion.create_revision(), open(CONTAINER_MOVE_CSV) as mf:
            m = Dataset().load(mf.read())
            self.mr.import_data(m, raise_errors=True)

        ci = Container.objects.get(barcode="tube001")
        self.assertEqual(ci.location.barcode, "rack001")
        self.assertEqual(ci.coordinates, "D05")
        self.assertEqual(ci.update_comment, "sample moved")

    def test_container_rename(self):
        self.load_samples()

        with reversion.create_revision(), open(CONTAINER_RENAME_CSV) as rf:
            r = Dataset().load(rf.read())
            self.rr.import_data(r, raise_errors=True)

        ci = Container.objects.get(barcode="box0010")
        self.assertEqual(ci.name, "original_box_2")
        self.assertEqual(ci.update_comment, "added 0")

        s = Sample.objects.get(container__barcode="tube0010")
        self.assertEqual(s.name, "sample1")

        # Foreign key relationships have been maintained

        self.assertEqual(Container.objects.filter(location=ci).count(), 2)

    def _test_invalid_rename_template(self, fh, err=IntegrityError):
        with reversion.create_revision(), self.assertRaises(err):
            d = fh.read()
            r = Dataset().load(d)
            self.rr.import_data(r, dry_run=True, raise_errors=True)
            r = Dataset().load(d)
            self.rr.import_data(r, raise_errors=True)

    def test_invalid_container_rename(self):
        for f, err in (
            ("Container_rename_v3_2_0_rename_invalid.csv", ValidationError),
            ("Container_rename_v3_2_0_same_rename.csv", ValidationError),
            ("Container_rename_v3_2_0_same_rename_2.csv", ValidationError),
            ("Container_rename_v3_2_0_double_rename.csv", ValueError),
        ):
            print(f"Testing invalid container rename {f}", flush=True)

            s = transaction.savepoint()

            with open(TEST_DATA_ROOT / f) as rf:
                self.load_samples()  # Load containers + samples
                self._test_invalid_rename_template(rf, err)
                
            transaction.savepoint_rollback(s)
