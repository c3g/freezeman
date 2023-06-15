from django.test import TestCase

from fms_core.models import (
    RunType,
    Container,
    Instrument,
    PropertyType,
    InstrumentType,
    SampleKind,
    ProcessMeasurement,
    Protocol,
)

from fms_core.tests.constants import create_container
from fms_core.services import experiment_run, sample
from datetime import datetime


class ExperimentRunServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        self.experiment_name = "TestName"
        self.start_date = datetime.strptime("2021-01-01", "%Y-%m-%d").date()
        self.run_type_name = "DNBSEQ"
        self.run_type, _ = RunType.objects.get_or_create(name=self.run_type_name)

        self.container, _ = Container.objects.get_or_create(
            **create_container(name="FlowcellMGI", barcode="FlowcellMGI",
                               kind="dnbseq-g400 flowcell"))
        self.container_invalid_kind, _ = Container.objects.get_or_create(
            **create_container(name="NotaFlowcell", barcode="NotAFlowcell", kind="96-well plate"))

        instrument_type, _ = InstrumentType.objects.get_or_create(type="DNBSEQ-G400")
        self.instrument_name = "02-Frida Kahlo"
        self.instrument, _ = Instrument.objects.get_or_create(name=self.instrument_name,
                                                              type=instrument_type)

        self.sk_DNA = SampleKind.objects.get(name="DNA")

        test_container_1 = Container.objects.create(barcode="TESTBARCODE",
                                                  name="TestName",
                                                  kind="tube"
                                                  )

        test_container_2 = Container.objects.create(barcode="TESTBARCODE2",
                                                  name="TestName2",
                                                  kind="tube"
                                                  )

        sample_1, errors, warnings = sample.create_full_sample(name="SampleTest",
                                                               volume=20,
                                                               collection_site="TestCollectionSite",
                                                               container=test_container_1,
                                                               sample_kind=self.sk_DNA,
                                                               creation_date="2022-01-01"
                                                               )

        sample_2, errors, warnings = sample.create_full_sample(name="SampleTest2",
                                                               volume=20,
                                                               collection_site="TestCollectionSite",
                                                               container=test_container_2,
                                                               sample_kind=self.sk_DNA,
                                                               creation_date="2022-01-01"
                                                               )

        self.samples_info = [
            {"sample_obj": sample_1, "volume_used": 5, "experiment_container_coordinates": "A01", "comment": "Comment1"},
            {"sample_obj": sample_2, "volume_used": 5, "experiment_container_coordinates": "A02", "comment": "Comment2"}
        ]

        self.properties = {
            "Flowcell Lot": {"property_type_obj": "", "value": "flowlot"},
            "Loading Method": {"property_type_obj": "", "value": "Auto - Loader"},
            "Sequencer Side": {"property_type_obj": "", "value": "Side A"},
            "Sequencer Kit Used": {"property_type_obj": "", "value": "DNBSEQ - T7 PE100"},
            "Sequencer Kit Lot": {"property_type_obj": "", "value": "seq kit lot"},
            "Read 1 Cycles": {"property_type_obj": "", "value": "pm kit"},
        }

        self.protocol = Protocol.objects.get(name="DNBSEQ Preparation")

        for o in list(PropertyType.objects.filter(name__in=self.properties.keys(), object_id=self.protocol.id)):
            self.properties[o.name]['property_type_obj'] = o

    def test_create_experiment_run(self):
        my_experiment_run, errors, warnings = experiment_run.create_experiment_run(experiment_run_name=self.experiment_name,
                                                                                   run_type_obj=self.run_type,
                                                                                   container_obj=self.container,
                                                                                   instrument_obj=self.instrument,
                                                                                   samples_info=self.samples_info,
                                                                                   process_properties=self.properties,
                                                                                   start_date=self.start_date)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(my_experiment_run.name, self.experiment_name)
        self.assertEqual(my_experiment_run.run_type.name, self.run_type_name)
        self.assertEqual(my_experiment_run.container.barcode, "FlowcellMGI")
        self.assertEqual(my_experiment_run.instrument.name, self.instrument_name)
        self.assertEqual(my_experiment_run.start_date, self.start_date)

        #Test that process measurements for associated samples were created
        for sample in self.samples_info:
            source_sample = sample['sample_obj']
            ProcessMeasurement.objects.filter(process=my_experiment_run.process, source_sample=source_sample).exists()

    def test_get_experiment_run(self):
        my_experiment_run, errors, warnings = experiment_run.create_experiment_run(experiment_run_name=self.experiment_name,
                                                                                   run_type_obj=self.run_type,
                                                                                   container_obj=self.container,
                                                                                   instrument_obj=self.instrument,
                                                                                   samples_info=self.samples_info,
                                                                                   process_properties=self.properties,
                                                                                   start_date=self.start_date)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

        my_experiment_run_again, errors, warnings = experiment_run.get_experiment_run(name=self.experiment_name)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(my_experiment_run.id, my_experiment_run_again.id)


    def test_missing_run_type(self):
        my_experiment_run, errors, warnings = experiment_run.create_experiment_run(experiment_run_name=self.experiment_name,
                                                                                   run_type_obj=None,
                                                                                   container_obj=self.container,
                                                                                   instrument_obj=self.instrument,
                                                                                   samples_info=self.samples_info,
                                                                                   process_properties=self.properties,
                                                                                   start_date=self.start_date
                                                                                   )
        self.assertEqual(my_experiment_run, None)
        self.assertTrue('Run type is required to create an experiment run.' in errors)
        self.assertEqual(warnings, [])

    def test_missing_process_properties(self):
        my_experiment_run, errors, warnings = experiment_run.create_experiment_run(experiment_run_name=self.experiment_name,
                                                                                   run_type_obj=self.run_type,
                                                                                   container_obj=self.container,
                                                                                   instrument_obj=self.instrument,
                                                                                   samples_info=self.samples_info,
                                                                                   process_properties=None,
                                                                                   start_date=self.start_date
                                                                                   )
        self.assertEqual(my_experiment_run, None)
        self.assertTrue('Process properties are required to create an experiment run.' in errors)
        self.assertEqual(warnings, [])

    def test_missing_parameters(self):
        my_experiment_run, errors, warnings = experiment_run.create_experiment_run(experiment_run_name=None,
                                                                                   run_type_obj=self.run_type,
                                                                                   container_obj=None,
                                                                                   instrument_obj=None,
                                                                                   samples_info=self.samples_info,
                                                                                   process_properties=self.properties,
                                                                                   start_date=self.start_date
                                                                                   )
        self.assertEqual(my_experiment_run, None)
        self.assertTrue('Run name is required to create an experiment run.' in errors)

        my_experiment_run, errors, warnings = experiment_run.create_experiment_run(experiment_run_name="Barbarun",
                                                                                   run_type_obj=self.run_type,
                                                                                   container_obj=None,
                                                                                   instrument_obj=None,
                                                                                   samples_info=self.samples_info,
                                                                                   process_properties=self.properties,
                                                                                   start_date=self.start_date
                                                                                   )

        self.assertEqual(my_experiment_run, None)
        self.assertTrue('container: This field cannot be null.' in errors)
        self.assertTrue('instrument: This field cannot be null.' in errors)
        self.assertEqual(warnings, [])

    def test_set_run_processing_start_time(self):
        my_experiment_run, errors, warnings = experiment_run.create_experiment_run(experiment_run_name=self.experiment_name,
                                                                                   run_type_obj=self.run_type,
                                                                                   container_obj=self.container,
                                                                                   instrument_obj=self.instrument,
                                                                                   samples_info=self.samples_info,
                                                                                   process_properties=self.properties,
                                                                                   start_date=self.start_date)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

        my_experiment_run, errors, warnings = experiment_run.set_run_processing_start_time(my_experiment_run.id)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertIsNotNone(my_experiment_run.run_processing_start_time)
        self.assertIsNone(my_experiment_run.run_processing_end_time)
        self.assertIsNotNone(my_experiment_run.end_time)
        self.assertEqual(my_experiment_run.run_processing_start_time, my_experiment_run.end_time)

    def test_set_run_processing_end_time(self):
        my_experiment_run, errors, warnings = experiment_run.create_experiment_run(experiment_run_name=self.experiment_name,
                                                                                   run_type_obj=self.run_type,
                                                                                   container_obj=self.container,
                                                                                   instrument_obj=self.instrument,
                                                                                   samples_info=self.samples_info,
                                                                                   process_properties=self.properties,
                                                                                   start_date=self.start_date)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

        my_experiment_run, errors, warnings = experiment_run.set_run_processing_end_time(my_experiment_run.id)
        
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertIsNone(my_experiment_run.run_processing_start_time)
        self.assertIsNotNone(my_experiment_run.run_processing_end_time)
        self.assertIsNone(my_experiment_run.end_time)