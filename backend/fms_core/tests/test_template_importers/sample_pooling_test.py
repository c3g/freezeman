from django.test import TestCase
from datetime import datetime
from decimal import Decimal

from django.db import transaction

from fms_core.template_importer.importers import SamplePoolingImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT, TEST_DATA_ROOT
from fms_core.tests.constants import create_individual

from fms_core.models import SampleKind, Protocol, Process, ProcessMeasurement, Individual, Sample, SampleLineage, DerivedSample, DerivedBySample
from fms_core.models._constants import DOUBLE_STRANDED

from fms_core.services.container import create_container
from fms_core.services.index import get_or_create_index_set, create_index
from fms_core.services.library import create_library, get_library_type
from fms_core.services.platform import get_platform
from fms_core.services.sample import create_full_sample
from fms_core.services.project import create_project

class SamplePoolingTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SamplePoolingImporter()
        self.file = APP_DATA_ROOT / "Sample_pooling_v4_2_0.xlsx"

        self.invalid_template_tests = ["Sample_pooling_v4_2_0_different_individuals.xlsx",
                                       "Sample_pooling_v4_2_0_different_kinds.xlsx",
                                       "Sample_pooling_v4_2_0_different_types.xlsx",
                                       "Sample_pooling_v4_2_0_missing_library_size.xlsx"]

        self.DNA_sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
        self.RNA_sample_kind, _ = SampleKind.objects.get_or_create(name="RNA")
        self.protocol_pooling = Protocol.objects.get(name="Sample Pooling")

        self.plate_source_name_and_barcode = "POOLFROMPLATE1"
        self.source_sample_initial_volume = 200

        self.prefill_data()


    def prefill_data(self):

        self.container, _, _ = create_container(barcode=self.plate_source_name_and_barcode,
                                                kind='96-well plate',
                                                name=self.plate_source_name_and_barcode)

        # index
        index_set, _, _, _ = get_or_create_index_set("PoolTestSet")
        self.index_1, _, _ = create_index(index_name="PoolLibIndex1", index_structure="TruSeqLT", index_set=index_set)
        self.index_2, _, _ = create_index(index_name="PoolLibIndex2", index_structure="TruSeqLT", index_set=index_set)
        self.index_3, _, _ = create_index(index_name="PoolLibIndex3", index_structure="TruSeqLT", index_set=index_set)

        # library type
        library_type, _, _ = get_library_type(name="PCR-free")

        # platform
        platform, _, _ = get_platform(name="ILLUMINA")

        self.library_1, _, _ = create_library(index=self.index_1, library_type=library_type, platform=platform, strandedness=DOUBLE_STRANDED, library_size=150)
        self.library_2, _, _ = create_library(index=self.index_2, library_type=library_type, platform=platform, strandedness=DOUBLE_STRANDED, library_size=150)
        self.library_3, _, _ = create_library(index=self.index_3, library_type=library_type, platform=platform, strandedness=DOUBLE_STRANDED, library_size=150)
        self.library_4, _, _ = create_library(index=self.index_3, library_type=library_type, platform=platform, strandedness=DOUBLE_STRANDED)

        self.same_individual = Individual.objects.create(**create_individual(individual_name="Bobinouille"))
        self.different_individual = Individual.objects.create(**create_individual(individual_name="Bobinoodle"))
        
        self.project, _, _ = create_project(name='TestProject')

        
    def test_import(self):
        self.source_sample_1, _, _ = \
            create_full_sample(name="SOURCESAMPLE1POOL1", alias="SOURCESAMPLE1POOL1", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite1", creation_date=datetime(2022, 9, 13, 0, 0), 
                               individual=Individual.objects.create(**create_individual(individual_name="Bobino")),
                               container=self.container, coordinates="A01", sample_kind=self.DNA_sample_kind, library=self.library_1, project=self.project)
                    
        self.source_sample_2, _, _ = \
            create_full_sample(name="SOURCESAMPLE2POOL1", alias="SOURCESAMPLE2POOL1", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite2", creation_date=datetime(2022, 9, 13, 0, 0),
                               individual=Individual.objects.create(**create_individual(individual_name="Bobinette")),
                               container=self.container, coordinates="A02", sample_kind=self.DNA_sample_kind, library=self.library_2, project=self.project)

        self.source_sample_3, _, _ = \
            create_full_sample(name="SOURCESAMPLE3POOL1", alias="SOURCESAMPLE3POOL1", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite3", creation_date=datetime(2022, 9, 13, 0, 0),
                               individual=Individual.objects.create(**create_individual(individual_name="Bobinouche")),
                               container=self.container, coordinates="A03", sample_kind=self.DNA_sample_kind, library=self.library_3, project=self.project)

        self.source_sample_4, _, _ = \
            create_full_sample(name="SOURCESAMPLE1POOL2", alias="SOURCESAMPLE1POOL2", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite4", creation_date=datetime(2022, 9, 13, 0, 0),
                               individual=self.same_individual, container=self.container, coordinates="A04", sample_kind=self.RNA_sample_kind, project=self.project)

        self.source_sample_5, _, _ = \
            create_full_sample(name="SOURCESAMPLE2POOL2", alias="SOURCESAMPLE2POOL2", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite4", creation_date=datetime(2022, 9, 13, 0, 0),
                               individual=self.same_individual, container=self.container, coordinates="A05", sample_kind=self.RNA_sample_kind, project=self.project)

        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        print(result)
        self.assertEqual(result['valid'], True)

        self.source_sample_1.refresh_from_db()
        self.source_sample_2.refresh_from_db()
        self.source_sample_3.refresh_from_db()
        self.source_sample_4.refresh_from_db()
        self.source_sample_5.refresh_from_db()

        self.assertEqual(Process.objects.filter(protocol=self.protocol_pooling).count(), 2)
        self.assertEqual(ProcessMeasurement.objects.filter(process__protocol=self.protocol_pooling).count(), 5)

        pm1 = ProcessMeasurement.objects.get(source_sample=self.source_sample_1, process__protocol=self.protocol_pooling)
        self.assertEqual(pm1.volume_used, 200)
        self.assertEqual(pm1.execution_date, datetime.strptime("2022-05-10", "%Y-%m-%d").date())
        self.assertEqual(pm1.comment, "Depleted source")
        self.assertEqual(self.source_sample_1.volume, self.source_sample_initial_volume-200)
        self.assertTrue(self.source_sample_1.depleted)

        pool1 = SampleLineage.objects.get(process_measurement=pm1, parent=self.source_sample_1).child

        pm2 = ProcessMeasurement.objects.get(source_sample=self.source_sample_2, process__protocol=self.protocol_pooling)
        self.assertEqual(pm2.volume_used, 50)
        self.assertEqual(pm2.execution_date, datetime.strptime("2022-05-10", "%Y-%m-%d").date())
        self.assertEqual(pm2.comment[:13], "Automatically")
        self.assertEqual(self.source_sample_2.volume, self.source_sample_initial_volume-50)
        self.assertFalse(self.source_sample_2.depleted)
        self.assertEqual(SampleLineage.objects.get(process_measurement=pm2, parent=self.source_sample_2).child, pool1)

        pm3 = ProcessMeasurement.objects.get(source_sample=self.source_sample_3, process__protocol=self.protocol_pooling)
        self.assertEqual(pm3.volume_used, 25)
        self.assertEqual(pm3.execution_date, datetime.strptime("2022-05-10", "%Y-%m-%d").date())
        self.assertEqual(pm3.comment[:13], "Automatically")
        self.assertEqual(self.source_sample_3.volume, self.source_sample_initial_volume-25)
        self.assertFalse(self.source_sample_3.depleted)
        self.assertEqual(SampleLineage.objects.get(process_measurement=pm3, parent=self.source_sample_3).child, pool1)

        p1 = pm1.process
        self.assertEqual(p1.comment, "This is a test pool")

        self.assertEqual(pool1.volume, 275)
        self.assertIsNone(pool1.concentration)
        self.assertEqual(pool1.container.name, "POOLTUBE")
        self.assertEqual(pool1.container.barcode, "POOLTUBE")
        self.assertEqual(pool1.container.kind, "tube")
        
        dbs1 = DerivedBySample.objects.get(sample=pool1, derived_sample=DerivedSample.objects.get(id=self.source_sample_1.derived_samples.first().id))
        ds1 = dbs1.derived_sample
        self.assertEqual(ds1.biosample.individual.name, "Bobino")
        self.assertEqual(ds1.library.index, self.index_1)
        self.assertEqual(dbs1.volume_ratio, Decimal("0.727"))
        dbs2 = DerivedBySample.objects.get(sample=pool1, derived_sample=DerivedSample.objects.get(id=self.source_sample_2.derived_samples.first().id))
        ds2 = dbs2.derived_sample
        self.assertEqual(ds2.biosample.individual.name, "Bobinette")
        self.assertEqual(ds2.library.index, self.index_2)
        self.assertEqual(dbs2.volume_ratio, Decimal("0.182"))
        dbs3 = DerivedBySample.objects.get(sample=pool1, derived_sample=DerivedSample.objects.get(id=self.source_sample_3.derived_samples.first().id))
        ds3 = dbs3.derived_sample
        self.assertEqual(ds3.biosample.individual.name, "Bobinouche")
        self.assertEqual(ds3.library.index, self.index_3)
        self.assertEqual(dbs3.volume_ratio, Decimal("0.091"))

        pm4 = ProcessMeasurement.objects.get(source_sample=self.source_sample_4, process__protocol=self.protocol_pooling)
        self.assertEqual(pm4.volume_used, 100)
        self.assertEqual(pm4.execution_date, datetime.strptime("2022-05-12", "%Y-%m-%d").date())
        self.assertEqual(pm4.comment, "half")
        self.assertEqual(self.source_sample_4.volume, self.source_sample_initial_volume-100)
        self.assertFalse(self.source_sample_4.depleted)

        pool2 = SampleLineage.objects.get(process_measurement=pm4, parent=self.source_sample_4).child

        pm5 = ProcessMeasurement.objects.get(source_sample=self.source_sample_5, process__protocol=self.protocol_pooling)
        self.assertEqual(pm5.volume_used, 100)
        self.assertEqual(pm5.execution_date, datetime.strptime("2022-05-12", "%Y-%m-%d").date())
        self.assertEqual(pm5.comment, "and half")
        self.assertEqual(self.source_sample_5.volume, self.source_sample_initial_volume-100)
        self.assertFalse(self.source_sample_5.depleted)
        self.assertEqual(SampleLineage.objects.get(process_measurement=pm5, parent=self.source_sample_5).child, pool2)
        
        p2 = pm4.process
        self.assertEqual(p2.comment, "This is more test pool")

        self.assertEqual(pool2.volume, 200)
        self.assertIsNone(pool2.concentration)
        self.assertEqual(pool2.container.name, "POOLPLATE")
        self.assertEqual(pool2.container.barcode, "POOLPLATE")
        self.assertEqual(pool2.container.kind, "96-well plate")
        
        dbs4 = DerivedBySample.objects.get(sample=pool2, derived_sample=DerivedSample.objects.get(id=self.source_sample_4.derived_samples.first().id))
        ds4 = dbs4.derived_sample
        self.assertEqual(ds4.biosample.individual.name, "Bobinouille")
        self.assertIsNone(ds4.library)
        self.assertEqual(dbs4.volume_ratio, Decimal("0.500"))
        dbs5 = DerivedBySample.objects.get(sample=pool2, derived_sample=DerivedSample.objects.get(id=self.source_sample_5.derived_samples.first().id))
        ds5 = dbs5.derived_sample
        self.assertEqual(ds5.biosample.individual.name, "Bobinouille")
        self.assertIsNone(ds5.library)
        self.assertEqual(dbs5.volume_ratio, Decimal("0.500"))

    def test_invalid_sample_pooling(self):
        self.source_sample_6, _, _ = \
            create_full_sample(name="SOURCESAMPLE1POOL3", alias="SOURCESAMPLE1POOL3", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite4", creation_date=datetime(2022, 9, 13, 0, 0),
                               individual=self.same_individual, container=self.container, coordinates="A06", sample_kind=self.DNA_sample_kind, project=self.project)

        self.source_sample_7, _, _ = \
            create_full_sample(name="SOURCESAMPLE2POOL3", alias="SOURCESAMPLE2POOL3", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite4", creation_date=datetime(2022, 9, 13, 0, 0),
                               individual=self.different_individual, container=self.container, coordinates="A07", sample_kind=self.DNA_sample_kind, project=self.project)

        self.source_sample_8, _, _ = \
            create_full_sample(name="SOURCESAMPLE1POOL4", alias="SOURCESAMPLE1POOL4", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite4", creation_date=datetime(2022, 9, 13, 0, 0),
                               individual=self.same_individual, container=self.container, coordinates="A08", sample_kind=self.RNA_sample_kind, project=self.project)

        self.source_sample_9, _, _ = \
            create_full_sample(name="SOURCESAMPLE1POOL4", alias="SOURCESAMPLE1POOL4", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite4", creation_date=datetime(2022, 9, 13, 0, 0),
                               individual=self.same_individual, container=self.container, coordinates="A09", sample_kind=self.DNA_sample_kind, project=self.project)

        self.source_sample_10, _, _ = \
            create_full_sample(name="SOURCESAMPLE1POOL5", alias="SOURCESAMPLE1POOL5", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite4", creation_date=datetime(2022, 9, 13, 0, 0),
                               individual=self.same_individual, container=self.container, coordinates="A10", sample_kind=self.DNA_sample_kind, project=self.project)

        self.source_sample_11, _, _ = \
            create_full_sample(name="SOURCESAMPLE2POOL5", alias="SOURCESAMPLE2POOL5", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite1", creation_date=datetime(2022, 9, 13, 0, 0), individual=self.same_individual,
                               container=self.container, coordinates="A11", sample_kind=self.DNA_sample_kind, library=self.library_1, project=self.project)

        self.source_sample_12, _, _ = \
            create_full_sample(name="SOURCESAMPLE1POOL6", alias="SOURCESAMPLE1POOL6", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite4", creation_date=datetime(2022, 9, 13, 0, 0), individual=self.same_individual,
                               container=self.container, coordinates="B01", sample_kind=self.DNA_sample_kind, library=self.library_2, project=self.project)

        self.source_sample_13, _, _ = \
            create_full_sample(name="SOURCESAMPLE2POOL6", alias="SOURCESAMPLE2POOL6", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="PoolSite1", creation_date=datetime(2022, 9, 13, 0, 0), individual=self.different_individual,
                               container=self.container, coordinates="B02", sample_kind=self.DNA_sample_kind, library=self.library_4, project=self.project)

        for f in self.invalid_template_tests:
            s = transaction.savepoint()
            result = load_template(importer=self.importer, file=TEST_DATA_ROOT / f)
            self.assertEqual(result['valid'], False)
            transaction.savepoint_rollback(s)
