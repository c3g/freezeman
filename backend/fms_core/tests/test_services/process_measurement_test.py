from django.test import TestCase

from fms_core.models import Protocol, Process, Container, SampleKind

from fms_core.services.sample import create_full_sample
from fms_core.services.process_measurement import create_process_measurement


class ProcessMeasurementTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        self.protocol_extraction = Protocol.objects.get(name="Extraction")
        self.protocol_update = Protocol.objects.get(name="Update")
        self.process_extraction = Process.objects.create(protocol=self.protocol_extraction)
        self.process_update = Process.objects.create(protocol=self.protocol_update)
        self.sk_DNA = SampleKind.objects.get(name="DNA")

        self.test_container = Container.objects.create(barcode="TESTBARCODECHILD",
                                                       name="TestChildName",
                                                       kind="tube"
                                                       )

        self.source_sample, errors, warnings = create_full_sample(name="TestSampleSource",
                                                                       volume=20,
                                                                       collection_site="TestCollectionSite",
                                                                       container=self.test_container,
                                                                       sample_kind=self.sk_DNA,
                                                                       creation_date="2022-01-01"
                                                                       )

    def test_create_process_measurement(self):
        process_measurement, errors, warnings = create_process_measurement(process=self.process_extraction,
                                                                           source_sample=self.source_sample,
                                                                           execution_date="2022-01-01",
                                                                           volume_used=2,
                                                                           comment="TestComment")
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(process_measurement.process, self.process_extraction)
        self.assertEqual(process_measurement.source_sample, self.source_sample)
        self.assertEqual(process_measurement.volume_used, 2)
        self.assertEqual(process_measurement.comment, "TestComment")

    def test_create_process_measurement_without_volume(self):
        process_measurement, errors, warnings = create_process_measurement(process=self.process_update,
                                                                           source_sample=self.source_sample,
                                                                           execution_date="2022-01-01",
                                                                           comment="TestComment")
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(process_measurement.process, self.process_update)
        self.assertEqual(process_measurement.source_sample, self.source_sample)
        self.assertEqual(process_measurement.comment, "TestComment")

    def test_create_process_measurement_invalid_volume(self):
        process_measurement, errors, warnings = create_process_measurement(process=self.process_extraction,
                                                                           source_sample=self.source_sample,
                                                                           execution_date="2022-01-01",
                                                                           comment="TestComment")
        self.assertTrue('Could not create ProcessMeasurement' in errors[0])
        self.assertEqual(warnings, [])
        self.assertEqual(process_measurement, None)

    def test_create_process_invalid_call(self):
        process_measurement, errors, warnings = create_process_measurement(None, None, None)
        self.assertEqual(process_measurement, None)
        self.assertEqual(errors, ['Process is required for process measurement creation.',
                                  'Source sample is required for process measurement creation.',
                                  'Execution date with format YYYY-MM-DD is required for process measurement creation.'])
        self.assertEqual(warnings, [])
