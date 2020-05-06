import os
import reversion
from django.test import TestCase
from pathlib import Path
from tablib import Dataset

from ..models import Container, Sample, ExtractedSample
from ..resources import skip_rows, ContainerResource, SampleResource, ExtractionResource


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
            self.assertEqual(len(Container.objects.all()), 4)

    def test_sample_import(self):
        with reversion.create_revision(manage_manually=True), \
                open(os.path.join(APP_DATA_ROOT, "containers.csv")) as cf, \
                open(os.path.join(APP_DATA_ROOT, "samples.csv")) as sf:
            c = Dataset().load(cf.read())
            self.cr.import_data(c, raise_errors=True)
            s = Dataset().load(sf.read())
            self.sr.import_data(s, raise_errors=True)
            self.assertEqual(len(Sample.objects.all()), 2)

    def test_sample_extraction_import(self):
        with reversion.create_revision(manage_manually=True), \
                open(os.path.join(APP_DATA_ROOT, "containers.csv")) as cf, \
                open(os.path.join(APP_DATA_ROOT, "samples.csv")) as sf, \
                open(os.path.join(APP_DATA_ROOT, "extractions.csv")) as ef:
            c = Dataset().load(cf.read())
            self.cr.import_data(c, raise_errors=True)
            s = Dataset().load(sf.read())
            self.sr.import_data(s, raise_errors=True)
            e = Dataset().load(ef.read())
            self.er.import_data(e, raise_errors=True)
            self.assertEqual(len(Sample.objects.all()), 4)
            self.assertEqual(len(ExtractedSample.objects.all()), 2)
