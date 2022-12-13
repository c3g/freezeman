from django.test import TestCase

from fms_core.services.instrument import get_instrument, get_instrument_type
from fms_core.services.platform import get_platform
from fms_core.models import Instrument, InstrumentType


class InstrumentServicesTestCase(TestCase):
    def setUp(self) -> None:
        # Create objects
        self.platform, _, _ = get_platform("DNBSEQ")
        self.instrument_type = InstrumentType.objects.get(type="DNBSEQ-T7")

        self.instrument_name = "T7_Example"
        self.instrument_serial_id = "Test101"
        self.invalid_instrument_name = "T7_Not_Created"
        self.invalid_instrument_type = "NOT_A_T7"
        Instrument.objects.get_or_create(name=self.instrument_name, type=self.instrument_type, serial_id=self.instrument_serial_id)

    def test_get_instrument(self):
        """
          Test assumes there's an instrument [T7_Example] already created
        """
        instrument, errors, warnings = get_instrument(self.instrument_name)

        self.assertEqual(instrument.name, self.instrument_name)
        self.assertEqual(instrument.type, self.instrument_type)
        self.assertEqual(instrument.serial_id, self.instrument_serial_id)

        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_get_invalid_instrument(self):
        """
          Test assumes there's not an instrument named [T7_Not_Created]
        """
        instrument, errors, warnings = get_instrument(self.invalid_instrument_name)

        self.assertEqual(instrument, None)
        self.assertEqual(errors, [f"No instrument named {self.invalid_instrument_name} could be found."])
        self.assertEqual(warnings, [])

    def test_get_instrument_type(self):
        instrument_type, errors, warnings = get_instrument_type(self.instrument_type)

        self.assertEqual(instrument_type, self.instrument_type)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_get_invalid_instrument(self):
        instrument_type, errors, warnings = get_instrument_type(self.invalid_instrument_type)

        self.assertEqual(instrument_type, None)
        self.assertEqual(errors, [f"No instrument type by the name of {self.invalid_instrument_type} could be found."])
        self.assertEqual(warnings, [])