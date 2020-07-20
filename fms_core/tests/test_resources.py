import os
import reversion
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from pathlib import Path
from tablib import Dataset

from ..models import Container, Sample, ExtractedSample
from ..resources import (
    skip_rows,
    ContainerResource,
    ExtractionResource,
    ContainerMoveResource,
    ContainerRenameResource,
    SampleResource,
    SampleUpdateResource,
)


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

    def load_samples(self):
        with reversion.create_revision(manage_manually=True), open(CONTAINERS_CSV) as cf, open(SAMPLES_CSV) as sf:
            c = Dataset().load(cf.read())
            self.cr.import_data(c, raise_errors=True)
            s = Dataset().load(sf.read())
            self.sr.import_data(s, raise_errors=True)

    def test_skip_rows(self):
        ds = get_ds()
        old_csv = ds.export("csv")

        skip_rows(ds, num_rows=0)
        self.assertEqual(ds.export("csv"), old_csv)

        skip_rows(ds, num_rows=2, col_skip=1)
        self.assertEqual(ds.export("csv").replace("\r", ""), CSV_1)

    def test_container_import(self):
        with reversion.create_revision(manage_manually=True), open(CONTAINERS_CSV) as cf:
            ds = Dataset().load(cf.read())
            self.cr.import_data(ds, raise_errors=True)
            self.assertEqual(len(Container.objects.all()), 5)

    def test_sample_import(self):
        with reversion.create_revision(manage_manually=True):
            self.load_samples()
            self.assertEqual(len(Sample.objects.all()), 3)

    def test_sample_extraction_import(self):
        with reversion.create_revision(manage_manually=True), open(EXTRACTIONS_CSV) as ef:
            self.load_samples()

            e = Dataset().load(ef.read())
            self.er.import_data(e, raise_errors=True)

            self.assertEqual(len(Sample.objects.all()), 5)
            self.assertEqual(len(ExtractedSample.objects.all()), 2)

            s = Sample.objects.get(container__barcode="tube003")
            self.assertEqual(s.extracted_from.update_comment,
                             "Extracted sample (imported from template) consumed 1.000 µL.")

    def test_sample_update(self):
        with reversion.create_revision(manage_manually=True), open(SAMPLE_UPDATE_CSV) as uf:
            self.load_samples()
            u = Dataset().load(uf.read())
            self.ur.import_data(u, raise_errors=True)

            s = Sample.objects.get(container__barcode="tube001")
            self.assertEqual(s.coordinates, "")
            self.assertEqual(s.concentration, Decimal("0.001"))
            self.assertEqual(s.comment, "some comment here")
            self.assertEqual(s.update_comment, "sample updated")

            s = Sample.objects.get(container__barcode="plate001", coordinates="A01")
            self.assertEqual(s.volume, Decimal("0.1"))
            self.assertEqual(s.concentration, Decimal("0.2"))
            self.assertEqual(s.update_comment, "sample 3 updated")

            # TODO: Test leaving coordinate blank not updating container coordinate

    def test_container_move(self):
        with reversion.create_revision(manage_manually=True), \
                open(CONTAINERS_CSV) as cf, \
                open(CONTAINER_MOVE_CSV) as mf:
            c = Dataset().load(cf.read())
            self.cr.import_data(c, raise_errors=True)
            m = Dataset().load(mf.read())
            self.mr.import_data(m, raise_errors=True)

            ci = Container.objects.get(barcode="tube001")
            self.assertEqual(ci.location.barcode, "rack001")
            self.assertEqual(ci.coordinates, "D05")
            self.assertEqual(ci.update_comment, "sample moved")

    def test_container_rename(self):
        with reversion.create_revision(manage_manually=True), open(CONTAINER_RENAME_CSV) as rf:
            self.load_samples()

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
        with self.assertRaises(err):
            d = fh.read()
            r = Dataset().load(d)
            self.rr.import_data(r, dry_run=True, raise_errors=True)
            r = Dataset().load(d)
            self.rr.import_data(r, raise_errors=True)

    def test_invalid_container_rename(self):
        for f, err in (
            ("rename_invalid.csv", ValidationError),
            ("same_rename.csv", IntegrityError),
            ("same_rename_2.csv", IntegrityError),
            ("double_rename.csv", ValueError),
        ):
            print(f"Testing invalid container rename {f}", flush=True)

            s = transaction.savepoint()

            with reversion.create_revision(manage_manually=True), open(os.path.join(TEST_DATA_ROOT, f)) as rf:
                self.load_samples()  # Load containers + samples
                self._test_invalid_rename_template(rf, err)

            transaction.savepoint_rollback(s)
