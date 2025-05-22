from django.test import TestCase

from django.utils import timezone

from fms_core.models import Readset, Dataset, Container, Platform, Instrument, InstrumentType, Protocol, Process, RunType, ExperimentRun, SampleKind, Project
from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE
from fms_report.models import ProductionData

from fms_core.tests.constants import create_container, create_fullsample


class ProductionDataTest(TestCase):
    def setUp(self):
        self.today = timezone.now().date()

        self.start_date = "2021-06-22"
        self.experiment_name = "RunNovaseq_100213"
        self.run_type_name = "Illumina"
        self.run_type, _ = RunType.objects.get_or_create(name=self.run_type_name)
        self.sample_kind_BLOOD, _ = SampleKind.objects.get_or_create(name="BLOOD", is_extracted=False)
        self.sample_kind_DNA, _ = SampleKind.objects.get_or_create(name="DNA", is_extracted=True)
        self.container, _ = Container.objects.get_or_create(**create_container(name="FlowcellTest", barcode="FlowcellTestBC", kind="illumina-novaseq-x-25b flowcell"))

        self.sample = create_fullsample(name="TestSample",
                                        sample_kind=self.sample_kind_DNA,
                                        volume=100,
                                        concentration=20,
                                        container=self.container,
                                        coordinates="A01",
                                        alias="Testinouche",
                                        tissue_source=self.sample_kind_BLOOD,
                                        individual=None)

        platform, _ = Platform.objects.get_or_create(name="PlatformTest")
        instrument_type, _ = InstrumentType.objects.get_or_create(type="InstrumentTypeTest",
                                                                  platform=platform,
                                                                  index_read_5_prime=INDEX_READ_FORWARD,
                                                                  index_read_3_prime=INDEX_READ_REVERSE)
        self.instrument_name = "Instrument1"
        self.instrument, _ = Instrument.objects.get_or_create(name=self.instrument_name,
                                                              type=instrument_type,
                                                              serial_id="Test101")

        self.protocol_name = "MyProtocolTest"
        self.protocol, _ = Protocol.objects.get_or_create(name=self.protocol_name)
        self.process = Process.objects.create(protocol=self.protocol, comment="Process test for ExperimentRun")

        self.project = Project.objects.create(name="MY_NAME_IS_PROJECT", external_id="P031553", principal_investigator="MrPotato")

        self.experiment_run = ExperimentRun.objects.create(name=self.experiment_name,
                                                           run_type=self.run_type,
                                                           container=self.container,
                                                           instrument=self.instrument,
                                                           process=self.process,
                                                           start_date=self.start_date)

        self.dataset = Dataset.objects.create(project=self.project, experiment_run=self.experiment_run, lane=1)
        self.readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset)


    def test_production_data(self):
        library = self.sample.derived_samples.all().first()
        data = ProductionData.objects.create(readset=self.readset,
                                             sequencing_date=self.today,
                                             library_creation_date=self.today,
                                             library_capture_date=None,
                                             run_name=self.experiment_name,
                                             experiment_run=self.experiment_run,
                                             experiment_container_kind=self.container.kind,
                                             lane=1,
                                             library=library,
                                             library_batch=self.process,
                                             is_internal_library=True,
                                             biosample=library.biosample,
                                             library_type="PCR-free",
                                             library_selection=None,
                                             project=self.project,
                                             taxon="E.T.",
                                             technology="SeqEnhancer",
                                             reads=10,
                                             bases=100)

        self.assertEqual(data.readset, self.readset)
        self.assertEqual(data.sequencing_date, self.today)
        self.assertEqual(data.library_creation_date, self.today)
        self.assertIsNone(data.library_capture_date)
        self.assertEqual(data.run_name, self.experiment_name)
        self.assertEqual(data.experiment_run, self.experiment_run)
        self.assertEqual(data.experiment_container_kind, self.container.kind)
        self.assertEqual(data.lane, 1)
        self.assertEqual(data.biosample.alias, library.biosample.alias)
        self.assertEqual(data.library, library)
        self.assertEqual(data.library_batch, self.process)
        self.assertTrue(data.is_internal_library)
        self.assertEqual(data.biosample, library.biosample)
        self.assertEqual(data.library_type, "PCR-free")
        self.assertIsNone(data.library_selection)
        self.assertEqual(data.project.name, self.project.name)
        self.assertEqual(data.project.external_id, self.project.external_id)
        self.assertEqual(data.project.principal_investigator, self.project.principal_investigator)
        self.assertEqual(data.taxon, "E.T.")
        self.assertEqual(data.technology, "SeqEnhancer")
        self.assertEqual(data.reads, 10)
        self.assertEqual(data.bases, 100)
