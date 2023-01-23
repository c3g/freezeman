from django.test import TestCase

from fms_core import templates
from fms_core.services.step import get_step_from_template
from fms_core.models import Protocol
from fms_core.template_importer.sheet_data import SheetData
from fms_core.template_importer._utils import blank_and_nan_to_none
from fms_core.tests.test_template_importers._utils import APP_DATA_ROOT
from fms_core.utils import str_normalize
from pandas import pandas as pd

class StepServicesTestCase(TestCase):
    def setUp(self) -> None:
        # extract sheets from library prep for test
        self.sheet_info = templates.LIBRARY_PREPARATION_TEMPLATE["sheets info"]
        self.file = APP_DATA_ROOT / "Library_preparation_v3_10_0.xlsx"
        self.sheets = {}
        for sheet in self.sheet_info:
            pd_sheet = pd.read_excel(self.file, sheet_name=sheet["name"], header=None)
            dataframe = pd_sheet.applymap(blank_and_nan_to_none).applymap(str_normalize)
            self.sheets[sheet["name"]] = SheetData(name=sheet["name"], dataframe=dataframe, headers=sheet["headers"])

        self.protocol = Protocol.objects.get(name="Library Preparation")

    def test_get_step_from_template(self):
        matches_dict, errors, warnings = get_step_from_template(protocol=self.protocol,
                                                                template_sheets=self.sheets,
                                                                template_sheet_definition=self.sheet_info)
        
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(matches_dict[0].name, "Library Preparation (PCR-free, DNBSEQ)")
        self.assertEqual(matches_dict[1].name, "Library Preparation (PCR-free, DNBSEQ)")
        self.assertEqual(matches_dict[2].name, "Library Preparation (PCR-enriched, Illumina)")
        self.assertEqual(matches_dict[3].name, "Library Preparation (PCR-enriched, Illumina)")