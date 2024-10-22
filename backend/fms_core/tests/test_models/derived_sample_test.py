from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.test import TestCase

from fms_core.models import Biosample, DerivedSample, Individual, SampleKind
from fms_core.tests.constants import create_biosample, create_individual, create_derivedsample


class DerivedSampleTest(TestCase):
    """ Test module for DerivedSample model """

    def setUp(self) -> None:
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
        self.valid_biosample = Biosample.objects.create(**create_biosample(individual=self.valid_individual))
        self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD", is_extracted=False)

    def test_derivedsample(self):
        derivedsample = DerivedSample.objects.create(**create_derivedsample(biosample=self.valid_biosample,
                                                                            sample_kind=self.sample_kind_BLOOD))
        self.assertEqual(DerivedSample.objects.count(), 1)
        self.assertEqual(derivedsample.sample_kind.name, "BLOOD")
        self.assertEqual(derivedsample.biosample, self.valid_biosample)

    def test_tissue_source_without_NA(self):
        with self.assertRaises(ValidationError):
            try:
                # tissue_source can only be specified for DNA and RNA
                tissue_source_for_blood = DerivedSample.objects.create(**create_derivedsample(biosample=self.valid_biosample,
                                                                                              sample_kind=self.sample_kind_BLOOD,
                                                                                              tissue_source=self.sample_kind_BLOOD))
            except ValidationError as e:
                self.assertIn("tissue_source", e.message_dict)
                raise e

    def test_invalid_sample_kind(self):
        with self.assertRaises(ObjectDoesNotExist):
            try:
                self.sample_kind_PUDDING, _ = SampleKind.objects.get(name="PUDDING")
                invalid_sample_kind = DerivedSample.objects.create(**create_derivedsample(biosample=self.valid_biosample,
                                                                                          sample_kind=self.sample_kind_PUDDING))
            except ObjectDoesNotExist as e:
                raise e

    def test_invalid_biosample(self):
        with self.assertRaises(ValidationError):
            invalid_biosample = Biosample()
            try:
                derived_invalid_biosample = DerivedSample.objects.create(**create_derivedsample(biosample=invalid_biosample,
                                                                                                sample_kind=self.sample_kind_BLOOD))
            except ValidationError as e:
                self.assertTrue('biosample' in e.message_dict)
                raise e