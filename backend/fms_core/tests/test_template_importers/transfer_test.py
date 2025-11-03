import decimal

from django.test import TestCase
from datetime import datetime

from fms_core.template_importer.importers import TransferImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT, TEST_DATA_ROOT

from fms_core.models import (Sample, Container, SampleKind, ProcessMeasurement, SampleLineage, Protocol,
                             Process, Coordinate, SampleNextStep, SampleNextStepByStudy, Workflow)

from fms_core.services.container import get_or_create_container
from fms_core.services.sample import create_full_sample, pool_samples
from fms_core.services.project import create_project
from fms_core.services.study import create_study


class TransferTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = TransferImporter()
        self.file = APP_DATA_ROOT / "Sample_transfer_v5_3_0.xlsx"

        self.invalid_template_tests = [TEST_DATA_ROOT / "Sample_transfer_v5_3_0_Missing_Study.xlsx",
                                       TEST_DATA_ROOT / "Sample_transfer_v5_3_0_With_Workflow_Progression.xlsx",
                                      ]

        self.prefill_data()


    def prefill_data(self):
        sample_kind_DNA, _ = SampleKind.objects.get_or_create(name='DNA')

        self.coord_A01 = Coordinate.objects.get(name="A01")
        self.coord_A02 = Coordinate.objects.get(name="A02")
        self.coord_A03 = Coordinate.objects.get(name="A03")
        self.coord_A04 = Coordinate.objects.get(name="A04")
        self.coord_A05 = Coordinate.objects.get(name="A05")
        self.coord_H08 = Coordinate.objects.get(name="H08")

        self.project_from, _, _ = create_project("TestTransferFrom")
        self.project_to, _, _ = create_project("TestTransferTo")
        workflow = Workflow.objects.get(name="PCR-free Illumina")
        self.study, _, _ = create_study(self.project_to, workflow, 2, 7)

        samples_info = [
            {'name': 'sample1transfer', 'volume': 400, 'container_barcode': 'Transfer_container_source_1', 'coordinates': 'A01', 'project': None},
            {'name': 'sample2transfer', 'volume': 400, 'container_barcode': 'Transfer_container_source_1', 'coordinates': 'A02', 'project': None},
            {'name': 'sample3transfer', 'volume': 400, 'container_barcode': 'Transfer_container_source_1', 'coordinates': 'A03', 'project': None},
            {'name': 'sample1pool', 'volume': 150, 'container_barcode': 'Pool_container_source_1', 'coordinates': 'A01', 'project': None},
            {'name': 'sample2pool', 'volume': 50,  'container_barcode': 'Pool_container_source_1', 'coordinates': 'A02', 'project': None},
            {'name': 'sample4transfer', 'volume': 400, 'container_barcode': 'Transfer_container_source_1', 'coordinates': 'A04', 'project': self.project_from},
            {'name': 'sample5transfer', 'volume': 400, 'container_barcode': 'Transfer_container_source_1', 'coordinates': 'A05', 'project': self.project_from},
        ]

        for info in samples_info:
            (container, _, errors, warnings) = get_or_create_container(barcode=info['container_barcode'], kind='96-well plate', name=info['container_barcode'])

            (sample, errors, warnings) = create_full_sample(name=info['name'], volume=info['volume'],
                                                            collection_site='site1',
                                                            creation_date=datetime(2020, 5, 21, 0, 0),
                                                            concentration=10,
                                                            container=container, coordinates=info['coordinates'],
                                                            sample_kind=sample_kind_DNA,
                                                            project=info["project"])

        (container_rack, _, errors, warnings) = get_or_create_container(barcode='RackTransfer', name='RackTransfer', kind='tube rack 8x12')
        (container_freezer, _, errors, warnings) = get_or_create_container(barcode='FreezerTransfer', name='FreezerTransfer', kind='freezer 5 shelves')

        destination_containers_info = [
            {'barcode': 'Transfer_container_dest_1', 'name': 'OldContainer', 'kind': '96-well plate', 'coordinates': 'A01', 'container_parent': container_freezer},
        ]
        for info in destination_containers_info:
            get_or_create_container(barcode=info['barcode'], name=info['name'], kind=info['kind'],
                                    coordinates=info['coordinates'], container_parent=info['container_parent'])

        # Create objects for the pooling test
        samples_to_pool_info = [
            {
                'Source Sample': Sample.objects.get(container__barcode="Pool_container_source_1", coordinate=self.coord_A01),
                'Volume Used': decimal.Decimal(20.0),
                'Volume In Pool': decimal.Decimal(20.0),
                'Source Depleted': False,
                'Comment': ''
             },
            {
                'Source Sample': Sample.objects.get(container__barcode="Pool_container_source_1", coordinate=self.coord_A02),
                'Volume Used': decimal.Decimal(5.0),
                'Volume In Pool': decimal.Decimal(5.0),
                'Source Depleted': False,
                'Comment': '',
            }
        ]

        (container_pool, _, errors, warnings) = get_or_create_container(barcode="PoolContainerSource",
                                                                        kind='Tube',
                                                                        name="PoolContainerSource")

        self.protocol_pooling = Protocol.objects.get(name="Sample Pooling")
        self.process_pooling = Process.objects.create(protocol=self.protocol_pooling)


        (pool, errors, warnings) = pool_samples(process=self.process_pooling,
                                                samples_info=samples_to_pool_info,
                                                pool_name='PoolToTransfer',
                                                container_destination=container_pool,
                                                coordinates_destination=None,
                                                execution_date=datetime(2020, 5, 21, 0, 0))


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)

        self.assertEqual(result['valid'], True)

        # Custom tests for each template
        ss1 = Sample.objects.get(container__barcode="Transfer_container_source_1", coordinate=self.coord_A01)
        self.assertEqual(ss1.volume, 200)
        self.assertFalse(ss1.depleted)
        self.assertTrue(Sample.objects.filter(container__barcode="Transfer_container_dest_1", coordinate=self.coord_A01).exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss1).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss1).exists())
        cs1 = Sample.objects.get(container__barcode="Transfer_container_dest_1", coordinate=self.coord_A01)
        sl1 = SampleLineage.objects.get(parent=ss1)
        pm1 = ProcessMeasurement.objects.get(source_sample=ss1)
        process1 = pm1.process
        self.assertEqual(sl1.child, cs1)
        self.assertEqual(sl1.process_measurement, pm1)
        self.assertEqual(pm1.source_sample, ss1)
        self.assertEqual(pm1.volume_used, 200)
        self.assertEqual(pm1.protocol_name, "Transfer")
        self.assertEqual(pm1.comment, "One Test")
        self.assertEqual(cs1.volume, 200)
        self.assertEqual(cs1.creation_date, pm1.execution_date)
        self.assertEqual(cs1.creation_date, datetime.strptime("2021-10-10", "%Y-%m-%d").date())

        ss2 = Sample.objects.get(container__barcode="Transfer_container_source_1", coordinate=self.coord_A02)
        self.assertEqual(ss2.volume, 300)
        self.assertFalse(ss2.depleted)
        self.assertTrue(Container.objects.filter(barcode="Transfer_container_dest_2", name="NewContainer").exists())
        self.assertTrue(Sample.objects.filter(container__barcode="Transfer_container_dest_2").exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss2).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss2).exists())
        cs2 = Sample.objects.get(container__barcode="Transfer_container_dest_2", container__coordinate=self.coord_H08)
        sl2 = SampleLineage.objects.get(parent=ss2)
        pm2 = ProcessMeasurement.objects.get(source_sample=ss2)
        process2 = pm2.process
        self.assertEqual(sl2.child, cs2)
        self.assertEqual(sl2.process_measurement, pm2)
        self.assertEqual(pm2.source_sample, ss2)
        self.assertEqual(pm2.volume_used, 100)
        self.assertEqual(pm2.protocol_name, "Transfer")
        self.assertEqual(pm2.comment, "Two Test")
        self.assertEqual(cs2.volume, 100)
        self.assertEqual(process2, process1)
        self.assertEqual(cs2.creation_date, pm2.execution_date)
        self.assertEqual(cs2.creation_date, datetime.strptime("2021-09-02", "%Y-%m-%d").date())

        ss3 = Sample.objects.get(container__barcode="Transfer_container_source_1", coordinate=self.coord_A03)
        self.assertEqual(ss3.volume, 0)
        self.assertTrue(ss3.depleted)
        self.assertTrue(Sample.objects.filter(container__barcode="Transfer_container_dest_1", coordinate=self.coord_A02).exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss3).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss3).exists())
        cs3 = Sample.objects.get(container__barcode="Transfer_container_dest_1", coordinate=self.coord_A02, container__coordinate=self.coord_A01)
        sl3 = SampleLineage.objects.get(parent=ss3)
        pm3 = ProcessMeasurement.objects.get(source_sample=ss3)
        process3 = pm3.process
        self.assertEqual(sl3.child, cs3)
        self.assertEqual(sl3.process_measurement, pm3)
        self.assertEqual(pm3.source_sample, ss3)
        self.assertEqual(pm3.volume_used, 400)
        self.assertEqual(pm3.protocol_name, "Transfer")
        self.assertEqual(pm3.comment, "Three Test")
        self.assertEqual(cs3.volume, 400)
        self.assertEqual(process3, process2)
        self.assertEqual(cs3.creation_date, pm3.execution_date)
        self.assertEqual(cs3.creation_date, datetime.strptime("2021-09-22", "%Y-%m-%d").date())

        ss4 = Sample.objects.get(container__barcode="Transfer_container_source_1", coordinate=self.coord_A04)
        self.assertEqual(ss4.volume, 300)
        self.assertFalse(ss4.depleted)
        self.assertTrue(Sample.objects.filter(container__barcode="Transfer_container_dest_1", coordinate=self.coord_A04).exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss4).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss4).exists())
        cs4 = Sample.objects.get(container__barcode="Transfer_container_dest_1", coordinate=self.coord_A04)
        sl4 = SampleLineage.objects.get(parent=ss4)
        pm4 = ProcessMeasurement.objects.get(source_sample=ss4)
        process1 = pm4.process
        self.assertEqual(sl4.child, cs4)
        self.assertEqual(sl4.process_measurement, pm4)
        self.assertEqual(pm4.source_sample, ss4)
        self.assertEqual(pm4.volume_used, 100)
        self.assertEqual(pm4.protocol_name, "Transfer")
        self.assertEqual(pm4.comment, "Project Transfer One")
        self.assertEqual(cs4.volume, 100)
        self.assertEqual(cs4.creation_date, pm4.execution_date)
        self.assertEqual(cs4.creation_date, datetime.strptime("2024-07-16", "%Y-%m-%d").date())
        self.assertEqual(ss4.derived_by_samples.first().project, self.project_from)
        self.assertEqual(cs4.derived_by_samples.first().project, self.project_to)
        self.assertTrue(SampleNextStep.objects.filter(sample=cs4).exists())
        self.assertTrue(SampleNextStepByStudy.objects.filter(study=self.study).exists())

        # test with corrected_current_volume = 600
        ss5 = Sample.objects.get(container__barcode="Transfer_container_source_1", coordinate=self.coord_A05)
        self.assertEqual(ss5.volume, 500)
        self.assertFalse(ss5.depleted)
        self.assertTrue(Sample.objects.filter(container__barcode="Transfer_container_dest_1", coordinate=self.coord_A05).exists())
        self.assertTrue(SampleLineage.objects.filter(parent=ss5).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=ss5).exists())
        cs5 = Sample.objects.get(container__barcode="Transfer_container_dest_1", coordinate=self.coord_A05)
        sl5 = SampleLineage.objects.get(parent=ss5)
        pm5 = ProcessMeasurement.objects.get(source_sample=ss5)
        process5 = pm5.process
        self.assertEqual(sl5.child, cs5)
        self.assertEqual(sl5.process_measurement, pm5)
        self.assertEqual(pm5.source_sample, ss5)
        self.assertEqual(pm5.volume_used, 100)
        self.assertEqual(pm5.protocol_name, "Transfer")
        self.assertEqual(pm5.comment, "Project Transfer One")
        self.assertEqual(cs5.volume, 100)
        self.assertEqual(process5, process1)
        self.assertEqual(cs5.creation_date, pm5.execution_date)
        self.assertEqual(cs5.creation_date, datetime.strptime("2024-07-16", "%Y-%m-%d").date())
        self.assertEqual(ss5.derived_by_samples.first().project, self.project_from)
        self.assertEqual(cs5.derived_by_samples.first().project, self.project_to)
        self.assertTrue(SampleNextStep.objects.filter(sample=cs5).exists())
        self.assertTrue(SampleNextStepByStudy.objects.filter(study=self.study).exists())


        # Pool test
        pool = Sample.objects.get(container__barcode="PoolContainerSource")
        self.assertEqual(pool.volume, 15)
        self.assertFalse(pool.depleted)
        self.assertTrue(
            Sample.objects.filter(container__barcode="Transfer_container_dest_1", coordinate=self.coord_A03).exists())
        self.assertTrue(SampleLineage.objects.filter(parent=pool).exists())
        self.assertTrue(ProcessMeasurement.objects.filter(source_sample=pool).exists())
        pool_transferred = Sample.objects.get(container__barcode="Transfer_container_dest_1", coordinate=self.coord_A03,
                                              container__coordinate=self.coord_A01)
        sl4 = SampleLineage.objects.get(parent=pool)
        pm4 = ProcessMeasurement.objects.get(source_sample=pool)
        process4 = pm4.process
        self.assertEqual(sl4.child, pool_transferred)
        self.assertEqual(sl4.process_measurement, pm4)
        self.assertEqual(pm4.source_sample, pool)
        self.assertEqual(pm4.volume_used, 10)
        self.assertEqual(pm4.protocol_name, "Transfer")
        self.assertEqual(pm4.comment, "Pool Test")
        self.assertEqual(pool_transferred.volume, 10)
        self.assertEqual(process4, process3)
        self.assertEqual(pool_transferred.creation_date, pm4.execution_date)
        self.assertEqual(pool_transferred.creation_date, datetime.strptime("2022-01-01", "%Y-%m-%d").date())

    def test_missing_study_for_project_transfer(self):
        result = {}
        result = load_template(importer=self.importer, file=self.invalid_template_tests[0])
        self.assertEqual(result['valid'], False)
        self.assertEqual(result["result_previews"][0]["rows"][0]["validation_error"].error_dict["transfered_sample"][0].messages[0], "To set destination project, you need a destination study within that project.")

    def test_workflow_progression_for_project_transfer(self):
        result = {}
        result = load_template(importer=self.importer, file=self.invalid_template_tests[1])
        self.assertEqual(result['valid'], False)
        self.assertEqual(result["result_previews"][0]["rows"][0]["validation_error"].error_dict["transfered_sample"][0].messages[0], "Assigning a new project and study is not allowed while following workflow. Set workflow action to [Ignore workflow - Do not register as part of a workflow] if you want to proceed.")