import reversion
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from pathlib import Path
from reversion.models import Version
from tablib import Dataset

from ..models import Container, Sample, ExtractedSample, Individual
from ..resources import (
    ContainerResource,
    ExtractionResource,
    ContainerMoveResource,
    ContainerRenameResource,
    SampleResource,
    SampleUpdateResource,
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


APP_DATA_ROOT = Path(__file__).parent.parent / "example_data" / "csv"
TEST_DATA_ROOT = Path(__file__).parent / "invalid_templates"

CONTAINERS_CSV = APP_DATA_ROOT / "containers.csv"
CONTAINER_MOVE_CSV = APP_DATA_ROOT / "container_move.csv"
CONTAINER_RENAME_CSV = APP_DATA_ROOT / "container_rename.csv"
EXTRACTIONS_CSV = APP_DATA_ROOT / "extractions.csv"
SAMPLES_CSV = APP_DATA_ROOT / "samples.csv"
SAMPLE_UPDATE_CSV = APP_DATA_ROOT / "sample_update.csv"


class ResourcesTestCase(TestCase):
    def setUp(self) -> None:
        self.cr = ContainerResource()
        self.sr = SampleResource()
        self.er = ExtractionResource()
        self.ur = SampleUpdateResource()
        self.mr = ContainerMoveResource()
        self.rr = ContainerRenameResource()

    def load_containers(self):
        with reversion.create_revision(), open(CONTAINERS_CSV) as cf:
            c = Dataset().load(cf.read())
            self.cr.import_data(c, raise_errors=True)

            reversion.set_comment("Loaded containers")

    def load_samples(self):
        self.load_containers()

        with reversion.create_revision(), open(SAMPLES_CSV) as sf:
            s = Dataset().load(sf.read())
            self.sr.import_data(s, raise_errors=True)

            reversion.set_comment("Loaded samples")

    def load_extractions(self):
        with reversion.create_revision(), open(EXTRACTIONS_CSV) as ef:
            e = Dataset().load(ef.read())
            self.er.import_data(e, raise_errors=True)

            reversion.set_comment("Loaded extractions")

    def load_samples_extractions(self):
        self.load_samples()
        self.load_extractions()

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
        self.assertEqual(len(Sample.objects.all()), 4)
        self.assertEqual(len(Individual.objects.all()), 6)  # 3 individuals plus 2 parents for DL

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
        with self.assertRaises(Container.DoesNotExist), open(TEST_DATA_ROOT / "bad_location.csv") as sf:
            s = Dataset().load(sf.read())
            self.sr.import_data(s, raise_errors=True)

    def test_no_conc_dna_import(self):
        self.load_containers()

        # noinspection PyTypeChecker
        with self.assertRaises(ValidationError), open(TEST_DATA_ROOT / "dna_no_conc.csv") as sf:
            s = Dataset().load(sf.read())
            try:
                self.sr.import_data(s, raise_errors=True)
            except ValidationError as e:
                self.assertDictEqual(
                    e.message_dict,
                    {'concentration': ['Concentration must be specified if the biospecimen_type is DNA']})
                raise e

    def test_sample_extraction_import(self):
        self.load_samples_extractions()

        self.assertEqual(len(Sample.objects.all()), 6)
        self.assertEqual(len(ExtractedSample.objects.all()), 2)

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
        self.assertEqual(s.extracted_from.update_comment,
                         "Extracted sample (imported from template) consumed 1.000 µL.")
        self.assertListEqual(s.extracted_from.volume_history, [
            {
                "update_type": "update",
                "volume_value": "10.000",
                "date": s.extracted_from.volume_history[0]["date"],
            },
            {
                "update_type": "extraction",
                "volume_value": "9.000",
                "date": s.extracted_from.volume_history[1]["date"],
                "extracted_sample_id": s.id,
            },
        ])
        self.assertFalse(s.extracted_from.depleted)

    def test_second_sample_extraction_import(self):
        self.load_samples_extractions()

        # Test second extraction
        s = Sample.objects.get(container__barcode="tube004")
        self.assertEqual(s.extracted_from.update_comment,
                         "Extracted sample (imported from template) consumed 15.000 µL.")
        self.assertListEqual(s.extracted_from.volume_history, [
            {
                "update_type": "update",
                "volume_value": "15.000",
                "date": s.extracted_from.volume_history[0]["date"],
            },
            {
                "update_type": "extraction",
                "volume_value": "0.000",
                "date": s.extracted_from.volume_history[1]["date"],
                "extracted_sample_id": s.id,
            },
        ])
        self.assertTrue(s.extracted_from.depleted)

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

        s = Sample.objects.get(container__barcode="tube001")
        self.assertTrue(s.depleted)
        self.assertEqual(s.update_comment, "sample 1 depleted")

        s = Sample.objects.get(container__barcode="plate001", coordinates="A01")
        self.assertEqual(s.volume, Decimal("0.1"))
        self.assertEqual(s.concentration, Decimal("0.2"))
        self.assertFalse(s.depleted)
        self.assertEqual(s.update_comment, "sample 3 updated")

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

        ci = Container.objects.get(barcode="box0001")
        self.assertEqual(ci.name, "original_box_2")
        self.assertEqual(ci.update_comment, "added 0")

        # Samples "swapped" due to rename

        s = Sample.objects.get(container__barcode="tube001")
        self.assertEqual(s.name, "sample2")

        s = Sample.objects.get(container__barcode="tube002")
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
            ("rename_invalid.csv", ValidationError),
            ("same_rename.csv", ValidationError),
            ("same_rename_2.csv", ValidationError),
            ("double_rename.csv", ValueError),
        ):
            print(f"Testing invalid container rename {f}", flush=True)

            s = transaction.savepoint()

            with open(TEST_DATA_ROOT / f) as rf:
                self.load_samples()  # Load containers + samples
                self._test_invalid_rename_template(rf, err)

            transaction.savepoint_rollback(s)
