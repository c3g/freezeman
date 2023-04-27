from django.core.exceptions import ValidationError
from django.test import TestCase

from fms_core.models import (Dataset, Readset, DatasetFile, SampleRunMetric, RunType, Container, Individual, Biosample,
                             SampleKind, DerivedSample, Platform, InstrumentType, Instrument, Process, Protocol, ExperimentRun)
from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE
from fms_core.tests.constants import create_container, create_biosample, create_individual, create_derivedsample


class SampleRunMetricTest(TestCase):
    def setUp(self):
        self.dataset = Dataset.objects.create(external_project_id="project", run_name="run", lane="1")
        self.readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset)
        self.dataset_file = DatasetFile.objects.create(readset=self.readset, file_path="file_path")

        self.valid_individual = Individual.objects.create(**create_individual(individual_name='jdoe'))
        self.valid_biosample = Biosample.objects.create(**create_biosample(individual=self.valid_individual))
        self.sample_kind_DNA, _ = SampleKind.objects.get_or_create(name="DNA", is_extracted=True, concentration_required=False)

        self.derived_sample = DerivedSample.objects.create(**create_derivedsample(biosample=self.valid_biosample,
                                                                                  sample_kind=self.sample_kind_DNA))

        self.start_date = "2023-04-27"
        self.run_type_name = "Illumina"
        self.run_type, _ = RunType.objects.get_or_create(name=self.run_type_name)

        self.container, _ = Container.objects.get_or_create(**create_container(name="Flowcell1212testtest", barcode="Flowcell1212testtest", kind="illumina-novaseq-s4 flowcell"))

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

        self.my_experiment_run = ExperimentRun.objects.create(run_type=self.run_type,
                                                              container=self.container,
                                                              instrument=self.instrument,
                                                              process=self.process,
                                                              start_date=self.start_date)

    def test_external_sample_run_metric(self): # without experiment_run and derived_sample, just a readset
        sample_run_metric = SampleRunMetric.objects.create(readset=self.readset)

        self.assertEqual(sample_run_metric.readset, self.readset)
        self.assertIsNone(sample_run_metric.experiment_run)
        self.assertIsNone(sample_run_metric.derived_sample)

    def test_internal_sample_run_metric(self): # with valid experiment_run, derived_sample and readset
        sample_run_metric = SampleRunMetric.objects.create(readset=self.readset,
                                                           experiment_run=self.my_experiment_run,
                                                           derived_sample=self.derived_sample)
        
        self.assertEqual(sample_run_metric.readset, self.readset)
        self.assertEqual(sample_run_metric.experiment_run, self.my_experiment_run)
        self.assertEqual(sample_run_metric.derived_sample, self.derived_sample)
