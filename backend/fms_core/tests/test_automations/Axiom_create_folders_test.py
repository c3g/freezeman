from django.test import TestCase
import datetime
import os

from fms_core.automations import AxiomCreateFolders
from fms_core.models import SampleKind
from fms_core.services.container import get_or_create_container
from fms_core.services.sample import create_full_sample

class AxiomCreateFoldersTestCase(TestCase):
    def setUp(self) -> None:
        self.automation = AxiomCreateFolders()
        self.automation_path = AxiomCreateFolders.work_folder
        self.list_sample_ids = []
        self.list_files_prefix_created = []
        sample_kind_DNA, _ = SampleKind.objects.get_or_create(name='DNA')

        samples_info = [
            {'name': 'AxiomTestSample1', 'volume': 100, 'container_barcode': 'AxiomTestPlate1', 'coordinates': 'A01'},
            {'name': 'AxiomTestSample2', 'volume': 90, 'container_barcode': 'AxiomTestPlate1', 'coordinates': 'B01'},
            {'name': 'AxiomTestSample3', 'volume': 90, 'container_barcode': 'AxiomTestPlate2', 'coordinates': 'A01'},
        ]

        for info in samples_info:
            container, _, _, _ = get_or_create_container(barcode=info['container_barcode'], kind='96-well plate', name=info['container_barcode'])
            self.list_files_prefix_created.append(container.name + "_" + str(container.id))
        
            sample, _, _ = create_full_sample(name=info['name'], volume=info['volume'], collection_site='site1',
                                              creation_date=datetime.datetime(2023, 11, 8, 0, 0),
                                              container=container, coordinates=info['coordinates'], sample_kind=sample_kind_DNA)
            self.list_sample_ids.append(sample.id)

    def tearDown(self) -> None:
        # Remove create files and folders
        for file_prefix in self.list_files_prefix_created:
            if os.path.exists(os.path.join(self.automation_path, file_prefix, file_prefix + ".PROJECT")):
                os.remove(os.path.join(self.automation_path, file_prefix, file_prefix + ".PROJECT"))
            if os.path.exists(os.path.join(self.automation_path, file_prefix)):
                os.rmdir(os.path.join(self.automation_path, file_prefix))
        return super().tearDown()

    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result, errors, warnings = self.automation.execute(self.list_sample_ids)
        self.assertEqual(result['success'], True)

        self.assertEqual(errors, {})
        self.assertEqual(warnings, {})

        # Verify
        for file_prefix in self.list_files_prefix_created:
            # Verify the existence of the folder
            self.assertTrue(os.path.exists(os.path.join(self.automation_path, file_prefix)))
            # Verify the existence of the file
            self.assertTrue(os.path.exists(os.path.join(self.automation_path, file_prefix, file_prefix + ".PROJECT")))
            # Verify the content of the file
            with open(os.path.join(self.automation_path, file_prefix, file_prefix + ".PROJECT")) as f:
                content = f.read()
            self.assertEqual(str(content), file_prefix)
