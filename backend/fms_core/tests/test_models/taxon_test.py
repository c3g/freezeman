from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import Taxon

class TaxonTest(TestCase):
    def setUp(self):
        self.name = "Test taxon"
        self.ncbi_id = 192229

    def test_taxon(self):
        t = Taxon.objects.create(name=self.name, ncbi_id=self.ncbi_id)
        self.assertEqual(t.name, self.name)
        self.assertEqual(t.ncbi_id, self.ncbi_id)

    def test_missing_name(self):
        with self.assertRaises(ValidationError):
            try:
                Taxon.objects.create(ncbi_id=self.ncbi_id)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_missing_ncbi_id(self):
        with self.assertRaises(ValidationError):
            try:
                Taxon.objects.create(name=self.name)
            except ValidationError as e:
                self.assertTrue('ncbi_id' in e.message_dict)
                raise e

    def test_duplicate_name(self):
        ncbi_id = 254324
        with self.assertRaises(ValidationError):
            # First taxon is correct
            Taxon.objects.get_or_create(name=self.name, ncbi_id=self.ncbi_id)
            try:
                # Second taxon should raise error.
                Taxon.objects.create(name=self.name, ncbi_id=ncbi_id)
            except ValidationError as e:
                self.assertTrue('name' in e.message_dict)
                raise e

    def test_duplicate_ncbi_id(self):
        name = "Test different taxon"
        with self.assertRaises(ValidationError):
            # First taxon is correct
            Taxon.objects.get_or_create(name=self.name, ncbi_id=self.ncbi_id)
            try:
                # Second taxon should raise error.
                Taxon.objects.create(name=name, ncbi_id=self.ncbi_id)
            except ValidationError as e:
                self.assertTrue('ncbi_id' in e.message_dict)
                raise e

    def test_taxon_with_similar_name(self):
        similar_name = "test taxon"
        different_ncbi_id = 4191247
        with self.assertRaises(ValidationError):
            # First taxon is valid
            Taxon.objects.get_or_create(name=self.name, ncbi_id=self.ncbi_id)
            try:
                # Second taxon has a similar name, but different upper/lower cases, should be invalid
                Taxon.objects.create(name=similar_name, ncbi_id=different_ncbi_id)
            except ValidationError as e:
                self.assertTrue("name" in e.message_dict)
                raise e