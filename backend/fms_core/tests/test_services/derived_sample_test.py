from django.test import TestCase

from fms_core.services import derived_sample, sample
from fms_core.models import Container, SampleKind

class DerivedSampleServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        test_container = Container.objects.create(barcode="TESTBARCODE",
                                                  name="TestName",
                                                  kind="tube"
                                                  )

        self.sk_DNA = SampleKind.objects.get(name="DNA")
        self.sk_BLOOD = SampleKind.objects.get(name="BLOOD")

        full_sample, errors, warnings = sample.create_full_sample(name="SampleTest",
                                                                  volume=20,
                                                                  collection_site="TestCollectionSite",
                                                                  container=test_container,
                                                                  sample_kind=self.sk_BLOOD,
                                                                  creation_date="2022-01-01"
                                                                  )

        self.original_derived_sample = full_sample.derived_sample_not_pool

    def test_inherit_derived_sample(self):
        # Test valid inherit derived sample
        new_derived_sample_data = {
            "sample_kind_id": self.sk_DNA.id,
            "tissue_source_id": self.sk_BLOOD.id,
        }
        new_derived_sample, error, warning = \
            derived_sample.inherit_derived_sample(self.original_derived_sample, new_derived_sample_data)
        self.assertEqual(new_derived_sample.biosample, self.original_derived_sample.biosample)
        self.assertEqual(new_derived_sample.sample_kind, self.sk_DNA)
        self.assertEqual(new_derived_sample.tissue_source, self.sk_BLOOD)
        self.assertEqual(error, [])
        self.assertEqual(warning, [])

    def test_invalid_inheritance(self):
        new_derived_sample_data = {
            "tissue_source_id": self.sk_DNA.id,  # DNA/RNA can't be specified as a tissue_source
            "library_id": 156,  # Invalid library id number
        }
        new_derived_sample, error, warning = \
        derived_sample.inherit_derived_sample(self.original_derived_sample, new_derived_sample_data)

        self.assertCountEqual(error, ['library instance with id 156 does not exist.;'
                                      'Tissue source can only be specified for extracted samples.'])
        self.assertEqual(warning, [])



