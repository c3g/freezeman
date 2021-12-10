from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Biosample, DerivedSample, DerivedBySample, Container, Individual, SampleKind, Sample
from fms_core.tests.constants import create_biosample, create_individual, create_derivedsample, create_sample_container, create_sample


class DerivedBySampleTest(TestCase):
    """ Test module for DerivedBySample model """

    def setUp(self) -> None:
        self.valid_individual = Individual.objects.create(**create_individual(individual_name='joeBlo'))
        self.valid_biosample = Biosample.objects.create(**create_biosample(individual=self.valid_individual))
        self.sample_kind_DNA, _ = SampleKind.objects.get_or_create(name="DNA")
        self.valid_derivedsample = DerivedSample.objects.create(**create_derivedsample(biosample=self.valid_biosample,
                                                                                       sample_kind=self.sample_kind_DNA))
        self.valid_container = Container.objects.create(**create_sample_container(kind='tube', name='TestTube01', barcode='T123456'))
        self.valid_sample = Sample.objects.create(**create_sample(container=self.valid_container, concentration=20.5))

    def test_derivedbysample(self):
        # Test basic 1 to 1 relation
        derivedbysample = DerivedBySample.objects.create(sample=self.valid_sample, derived_sample=self.valid_derivedsample, volume_ratio=1)
        self.assertEqual(DerivedBySample.objects.count(), 1)
        self.assertEqual(derivedbysample.sample, self.valid_sample)
        self.assertEqual(derivedbysample.derived_sample, self.valid_derivedsample)
        self.assertEqual(derivedbysample.volume_ratio, 1)

    def test_missing_concentration_with_DNA(self):
        with self.assertRaises(ValidationError):
            no_concentration_sample = Sample.objects.create(**create_sample(container=self.valid_container))
            try:
                # concentration must be specified for DNA
                sample_missing_concentration = DerivedBySample.objects.create(sample=no_concentration_sample, derived_sample=self.valid_derivedsample, volume_ratio=1)
            except ValidationError as e:
                self.assertIn("concentration", e.message_dict)
                raise e