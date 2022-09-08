from django.test import TestCase

from fms_core.models import Protocol

from fms_core.services.process import create_process


class ProcessServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        self.protocol_extraction = Protocol.objects.get(name="Extraction")

        self.protocol_infinium = Protocol.objects.get(name="Illumina Infinium Preparation")
        self.protocol_amplification = Protocol.objects.get(name="Infinium: Amplification")

    def test_create_process(self):
        process_by_protocol_id, errors, warnings = create_process(protocol=self.protocol_extraction, creation_comment="TestComment")
        process = process_by_protocol_id[self.protocol_extraction.id]
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(process.protocol, self.protocol_extraction)
        self.assertEqual(process.comment, "TestComment")

    def test_create_process_invalid_protocol(self):
        process_by_protocol_id, errors, warnings = create_process(protocol=None, creation_comment="TestComment")
        self.assertEqual(errors, ['Protocol needed to create a process.'])
        self.assertEqual(warnings, [])
        self.assertEqual(process_by_protocol_id, {})

    def test_create_process_children(self):
        process_by_protocol_id, errors, warnings = create_process(protocol=self.protocol_infinium, create_children=True, children_protocols=[self.protocol_amplification], creation_comment="TestComment")
        process_infinium = process_by_protocol_id[self.protocol_infinium.id]
        process_amplification = process_by_protocol_id[self.protocol_amplification.id]
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(process_amplification.parent_process, process_infinium)
