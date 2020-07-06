import os
import reversion
from decimal import Decimal
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


class ResourcesTestCase(TestCase):
    def setUp(self) -> None:
        self.cr = ContainerResource()
        self.sr = SampleResource()
        self.er = ExtractionResource()
        self.ur = SampleUpdateResource()
        self.mr = ContainerMoveResource()
        self.rr = ContainerRenameResource()

    def load_samples(self):
        with reversion.create_revision(manage_manually=True), \
                open(os.path.join(APP_DATA_ROOT, "containers.csv")) as cf, \
                open(os.path.join(APP_DATA_ROOT, "samples.csv")) as sf:
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
        with reversion.create_revision(manage_manually=True), open(os.path.join(APP_DATA_ROOT, "containers.csv")) as cf:
            ds = Dataset().load(cf.read())
            self.cr.import_data(ds, raise_errors=True)
            self.assertEqual(len(Container.objects.all()), 5)

    def test_sample_import(self):
        with reversion.create_revision(manage_manually=True):
            self.load_samples()
            self.assertEqual(len(Sample.objects.all()), 3)

    def test_sample_extraction_import(self):
        with reversion.create_revision(manage_manually=True), \
                open(os.path.join(APP_DATA_ROOT, "extractions.csv")) as ef:
            self.load_samples()

            e = Dataset().load(ef.read())
            self.er.import_data(e, raise_errors=True)

            self.assertEqual(len(Sample.objects.all()), 5)
            self.assertEqual(len(ExtractedSample.objects.all()), 2)

            s = Sample.objects.get(container_id="tube003")
            self.assertEqual(s.extracted_from.update_comment,
                             "Extracted sample (imported from template) consumed 1.000 µL.")

    def test_sample_update(self):
        with reversion.create_revision(manage_manually=True), \
                open(os.path.join(APP_DATA_ROOT, "sample_update.csv")) as uf:
            self.load_samples()
            u = Dataset().load(uf.read())
            self.ur.import_data(u, raise_errors=True)

            s = Sample.objects.get(container_id="tube001")
            self.assertEqual(s.coordinates, "")
            self.assertEqual(s.concentration, Decimal("0.001"))
            self.assertEqual(s.comment, "some comment here")
            self.assertEqual(s.update_comment, "sample updated")

            s = Sample.objects.get(container_id="plate001", coordinates="A01")
            self.assertEqual(s.volume, Decimal("0.1"))
            self.assertEqual(s.concentration, Decimal("0.2"))
            self.assertEqual(s.update_comment, "sample 3 updated")

            # TODO: Test leaving coordinate blank not updating container coordinate

    def test_container_move(self):
        with reversion.create_revision(manage_manually=True), \
                open(os.path.join(APP_DATA_ROOT, "containers.csv")) as cf, \
                open(os.path.join(APP_DATA_ROOT, "container_move.csv")) as mf:
            c = Dataset().load(cf.read())
            self.cr.import_data(c, raise_errors=True)
            m = Dataset().load(mf.read())
            self.mr.import_data(m, raise_errors=True)

            ci = Container.objects.get(barcode="tube001")
            self.assertEqual(ci.location_id, "rack001")
            self.assertEqual(ci.coordinates, "D05")
            self.assertEqual(ci.update_comment, "sample moved")

    def test_container_rename(self):
        with reversion.create_revision(manage_manually=True), \
                 open(os.path.join(APP_DATA_ROOT, "containers.csv")) as cf, \
                 open(os.path.join(APP_DATA_ROOT, "samples.csv")) as sf, \
                 open(os.path.join(APP_DATA_ROOT, "container_rename.csv")) as rf:
            c = Dataset().load(cf.read())
            self.cr.import_data(c, raise_errors=True)

            s = Dataset().load(sf.read())
            self.sr.import_data(s, raise_errors=True)

            r = Dataset().load(rf.read())
            self.rr.import_data(r, raise_errors=True)

            ci = Container.objects.get(barcode="box0001")
            self.assertEqual(ci.name, "original_box_2")
            self.assertEqual(ci.update_comment, "added 0")

            # Check foreign keys

            Sample.objects.get(container_id="tube0001")
            self.assertEqual(Container.objects.filter(location=ci).count(), 3)
