from django.test import TestCase

from fms_core.models import Dataset, DatasetFile, Readset
from fms_core.models import (
    RunType,
    Container,
    Instrument,
    Platform,
    InstrumentType,
    Process,
    Protocol,
    ExperimentRun,
    Project
)
from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE

from fms_core.tests.constants import create_container

class DatasetFileTest(TestCase):
    """ Test module for DatasetFile model """

    def setUp(self) -> None:
        self.start_date = "2025-04-07"
        self.experiment_name = "RunNovaseq_331131"
        self.run_type_name = "Illumina"
        self.run_type, _ = RunType.objects.get_or_create(name=self.run_type_name)

        self.container, _ = Container.objects.get_or_create(**create_container(name="Flowcell1212testtest", barcode="Flowcell1212testtest", kind="illumina-novaseq-s4 flowcell"))
        self.container_invalid_kind, _ = Container.objects.get_or_create(**create_container(name="NotAFlowcell", barcode="NotAFlowcell", kind="96-well plate"))

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

        my_project = Project.objects.create(name="MyProject", external_id="P000311")

        my_experiment_run = ExperimentRun.objects.create(name=self.experiment_name,
                                                         run_type=self.run_type,
                                                         container=self.container,
                                                         instrument=self.instrument,
                                                         process=self.process,
                                                         start_date=self.start_date)

        self.dataset = Dataset.objects.create(project=my_project, experiment_run=my_experiment_run, lane="1")
        self.readset = Readset.objects.create(name="My_Readset", sample_name="My", dataset=self.dataset)

    def test_dataset_file(self):
        dataset_file = DatasetFile.objects.create(readset=self.readset, file_path="file_path",size=3)

        self.assertEqual(DatasetFile.objects.count(), 1)
        self.assertEqual(dataset_file.readset.dataset, self.dataset)
        self.assertEqual(dataset_file.file_path, "file_path")
        self.assertEqual(dataset_file.readset.sample_name, "My")
        self.assertEqual(dataset_file.size, 3)

