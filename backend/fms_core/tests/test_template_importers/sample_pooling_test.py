from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
import datetime

from fms_core.template_importer.importers import SamplePoolingImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT
from fms_core.tests.constants import create_individual

from fms_core.models import SampleKind, Protocol, Process, ProcessMeasurement
from fms_core.models._constants import DOUBLE_STRANDED

from fms_core.services.container import create_container
from fms_core.services.sample import create_full_sample
from fms_core.services.index import get_or_create_index_set, create_index
from fms_core.services.library import create_library, get_library_type
from fms_core.services.platform import get_platform


class LibraryPreparationTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SamplePoolingImporter()
        self.file = APP_DATA_ROOT / "Sample_pooling_v3_12_0.xlsx"
        ContentType.objects.clear_cache()

        self.DNA_sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
        self.RNA_sample_kind, _ = SampleKind.objects.get_or_create(name="RNA")
        self.protocol_pooling = Protocol.objects.get(name="Sample pooling")

        self.plate_source_name_and_barcode = "POOLFROMPLATE1"
        self.source_sample_initial_volume = 200

        self.prefill_data()


    def prefill_data(self):

        container, _, _ = create_container(barcode=self.plate_source_name_and_barcode,
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

        library_1, _, _ = create_library(index=self.index_1, library_type=library_type, platform=platform, strandedness=DOUBLE_STRANDED)
        library_2, _, _ = create_library(index=self.index_2, library_type=library_type, platform=platform, strandedness=DOUBLE_STRANDED)
        library_3, _, _ = create_library(index=self.index_3, library_type=library_type, platform=platform, strandedness=DOUBLE_STRANDED)

        self.source_sample_1, _, _ = \
            create_full_sample(name="SOURCESAMPLE1POOL1", alias="SOURCESAMPLE1POOL1", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site='PoolingTestSite', creation_date=datetime.datetime(2022, 8, 12, 0, 0), sample_kind=self.DNA_sample_kind,
                               container=container, coordinates="A01", individual=create_individual("Bobino"))
        self.source_sample_1.library = library_1
        self.source_sample_1.save()
                    
        self.source_sample_2, _, _ = \
            create_full_sample(name="SOURCESAMPLE2POOL1", alias="SOURCESAMPLE2POOL1", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site='PoolingTestSite', creation_date=datetime.datetime(2022, 8, 12, 0, 0), sample_kind=self.DNA_sample_kind,
                               container=container, coordinates="A02", individual=create_individual("Bobinette"))
        self.source_sample_2.library = library_2
        self.source_sample_2.save()

        self.source_sample_3, _, _ = \
            create_full_sample(name="SOURCESAMPLE3POOL1", alias="SOURCESAMPLE3POOL1", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site='PoolingTestSite', creation_date=datetime.datetime(2022, 8, 12, 0, 0), sample_kind=self.DNA_sample_kind,
                               container=container, coordinates="A03", individual=create_individual("Bobinouche"))
        self.source_sample_3.library = library_3
        self.source_sample_3.save()

        self.source_sample_4, _, _ = \
            create_full_sample(name="SOURCESAMPLE1POOL2", alias="SOURCESAMPLE1POOL2", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site='PoolingTestSite', creation_date=datetime.datetime(2022, 8, 12, 0, 0), sample_kind=self.RNA_sample_kind,
                               container=container, coordinates="A04", individual=create_individual("Bobinouille"))

        self.source_sample_5, _, _ = \
            create_full_sample(name="SOURCESAMPLE2POOL2", alias="SOURCESAMPLE2POOL2", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site='PoolingTestSite', creation_date=datetime.datetime(2022, 8, 12, 0, 0), sample_kind=self.RNA_sample_kind,
                               container=container, coordinates="A05", individual=create_individual("Bobinoodle"))      


    def test_import(self):
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)

        self.assertEqual(Process.objects.filter(protocol=self.protocol_pooling).count(), 2)
        self.assertEqual(ProcessMeasurement.objects.filter(process__protocol=self.protocol_pooling).count(), 5)

        pm1 = ProcessMeasurement.objects.get(source_sample=self.source_sample_1, process__protocol=self.protocol_pooling)
        self.assertEqual(pm1.volume_used, 200)
        self.assertEqual(pm1.execution_date, datetime.strptime("2022-05-10", "%Y-%m-%d").date())
        self.assertEqual(pm1.comment, "Depleted source")
        self.assertEqual(self.source_sample_1.volume, self.source_sample_initial_volume-200)
        self.assertTrue(self.source_sample_1.depleted)

        pool1 = pm1.lineage.child

        pm2 = ProcessMeasurement.objects.get(source_sample=self.source_sample_2, process__protocol=self.protocol_pooling)
        self.assertEqual(pm2.volume_used, 50)
        self.assertEqual(pm2.execution_date, datetime.strptime("2022-05-10", "%Y-%m-%d").date())
        self.assertEqual(pm2.comment, "")
        self.assertEqual(self.source_sample_2.volume, self.source_sample_initial_volume-50)
        self.assertFalse(self.source_sample_2.depleted)
        self.assertEqual(pm2.lineage.child, pool1)

        pm3 = ProcessMeasurement.objects.get(source_sample=self.source_sample_3, process__protocol=self.protocol_pooling)
        self.assertEqual(pm3.volume_used, 25)
        self.assertEqual(pm3.execution_date, datetime.strptime("2022-05-10", "%Y-%m-%d").date())
        self.assertEqual(pm3.comment, "")
        self.assertEqual(self.source_sample_3.volume, self.source_sample_initial_volume-25)
        self.assertFalse(self.source_sample_3.depleted)
        self.assertEqual(pm3.lineage.child, pool1)

        p1 = pm1.process
        self.assertEqual(p1.comment, "This is a test pool")

        self.assertEqual(pool1.volume, 275)
        self.assertEqual(pool1.concentration, 25)
        self.assertEqual(pool1.container.name, "POOLTUBE")
        self.assertEqual(pool1.container.barcode, "POOLTUBE")
        self.assertEqual(pool1.container.kind, "tube")
        
        derived1 = pool1.derived_samples.filter(samples__in=self.source_sample_1)
        self.assertEqual(derived1.individual.name, "Bobino")
        self.assertEqual(derived1.library.index, self.index_1)
        self.assertEqual(derived1.derived_by_samples.volume_ratio, 0.727)
        derived2 = pool1.derived_samples.filter(samples__in=self.source_sample_2)
        self.assertEqual(derived2.individual.name, "Bobinette")
        self.assertEqual(derived2.library.index, self.index_2)
        self.assertEqual(derived2.derived_by_samples.volume_ratio, 0.182)
        derived3 = pool1.derived_samples.filter(samples__in=self.source_sample_3)
        self.assertEqual(derived3.individual.name, "Bobinouche")
        self.assertEqual(derived3.library.index, self.index_3)
        self.assertEqual(derived3.derived_by_samples.volume_ratio, 0.091)


        pm4 = ProcessMeasurement.objects.get(source_sample=self.source_sample_4, process__protocol=self.protocol_pooling)
        self.assertEqual(pm4.volume_used, 100)
        self.assertEqual(pm4.execution_date, datetime.strptime("2022-05-12", "%Y-%m-%d").date())
        self.assertEqual(pm4.comment, "half")
        self.assertEqual(self.source_sample_4.volume, self.source_sample_initial_volume-100)
        self.assertFalse(self.source_sample_4.depleted)

        pool2 = pm4.lineage.child

        pm5 = ProcessMeasurement.objects.get(source_sample=self.source_sample_5, process__protocol=self.protocol_pooling)
        self.assertEqual(pm5.volume_used, 100)
        self.assertEqual(pm5.execution_date, datetime.strptime("2022-05-12", "%Y-%m-%d").date())
        self.assertEqual(pm5.comment, "and half")
        self.assertEqual(self.source_sample_5.volume, self.source_sample_initial_volume-100)
        self.assertFalse(self.source_sample_5.depleted)
        self.assertEqual(pm5.lineage.child, pool2)
        
        p2 = pm4.process
        self.assertEqual(p2.comment, "This is more test pool")

        self.assertEqual(pool2.volume, 275)
        self.assertEqual(pool2.concentration, 25)
        self.assertEqual(pool2.container.name, "POOLPLATE")
        self.assertEqual(pool2.container.barcode, "POOLPLATE")
        self.assertEqual(pool2.container.kind, "96-well plate")
        
        derived4 = pool2.derived_samples.filter(samples__in=self.source_sample_4)
        self.assertEqual(derived4.individual.name, "Bobinouille")
        self.assertEqual(derived4.library.index, self.index_4)
        self.assertEqual(derived4.derived_by_samples.volume_ratio, 0.500)
        derived5 = pool2.derived_samples.filter(samples__in=self.source_sample_5)
        self.assertEqual(derived5.individual.name, "Bobinoodle")
        self.assertEqual(derived5.library.index, self.index_5)
        self.assertEqual(derived5.derived_by_samples.volume_ratio, 0.500)