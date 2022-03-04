from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import IndexCreationImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models import Index, IndexSet, IndexStructure, Sequence


class IndexCreationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = IndexCreationImporter()
        self.file = APP_DATA_ROOT / "Index_creation_v3_7_0.xlsx"
        ContentType.objects.clear_cache()

        #first 2 indices belong to set 1 and index structure TrueSeqLT
        #Thirs index belongs to set 2 and index structure IDTStubby
        self.set_name_1 = 'Test_set_1'
        self.set_name_2 = 'Test_set_2'
        self.index_name_1 = 'Test_index_1'
        self.index_name_2 = 'Test_index_2'
        self.index_name_3 = 'Test_index_3'
        self.index_structure_name_1 = 'TruSeqHT'
        self.index_structure_name_2 = 'IDTStubby'
        self.sequence_1 = 'ACTG'
        self.sequence_2 = 'TCAG'

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        # First index tests
        index_1 = Index.objects.get(name=self.index_name_1)
        index_set_1 = IndexSet.objects.get(name=self.set_name_1)
        index_structure_1 = IndexStructure.objects.get(name=self.index_structure_name_1)

        self.assertEqual(index_1.name, self.index_name_1)
        self.assertEqual(index_1.index_set, index_set_1)
        self.assertEqual(index_set_1.name, self.set_name_1)
        self.assertEqual(index_1.index_structure, index_structure_1)
        self.assertEqual(index_structure_1.name, self.index_structure_name_1)

        #Second index tests
        index_2 = Index.objects.get(name=self.index_name_2)
        index_set_2 = IndexSet.objects.get(name=self.set_name_1)
        index_structure_2 = IndexStructure.objects.get(name=self.index_structure_name_1)

        self.assertEqual(index_2.name, self.index_name_2)
        self.assertEqual(index_2.index_set, index_set_2)
        self.assertEqual(index_set_2.name, self.set_name_1)
        self.assertEqual(index_2.index_structure, index_structure_2)
        self.assertEqual(index_structure_2.name, self.index_structure_name_1)

        #Third index tests
        index_3 = Index.objects.get(name=self.index_name_3)
        index_set_3 = IndexSet.objects.get(name=self.set_name_2)
        index_structure_3 = IndexStructure.objects.get(name=self.index_structure_name_2)

        self.assertEqual(index_3.name, self.index_name_3)
        self.assertEqual(index_3.index_set, index_set_3)
        self.assertEqual(index_set_3.name, self.set_name_2)
        self.assertEqual(index_3.index_structure, index_structure_3)
        self.assertEqual(index_structure_3.name, self.index_structure_name_2)

        #Sequences tests
        self.assertTrue(Sequence.objects.filter(value=self.sequence_1).exists())
        self.assertTrue(Sequence.objects.filter(value=self.sequence_2).exists())




