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
    def test_get_step_from_template(self):
        # extract sheets from library prep for test
        sheet_info = templates.LIBRARY_PREPARATION_TEMPLATE["sheets info"]
        file = APP_DATA_ROOT / "Library_preparation_v4_4_0.xlsx"
        sheets = {}
        for sheet in sheet_info:
            pd_sheet = pd.read_excel(file, sheet_name=sheet["name"], header=None)
            dataframe = pd_sheet.map(blank_and_nan_to_none).map(str_normalize)
            sheets[sheet["name"]] = SheetData(name=sheet["name"], dataframe=dataframe, headers=sheet["headers"])

        protocol = Protocol.objects.get(name="Library Preparation")
        matches_dict, errors, warnings = get_step_from_template(protocol=protocol,
                                                                template_sheets=sheets,
                                                                template_sheet_definition=sheet_info)
        
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(matches_dict[0].name, "Library Preparation (PCR-free, DNBSEQ)")
        self.assertEqual(matches_dict[1].name, "Library Preparation (PCR-free, DNBSEQ)")
        self.assertEqual(matches_dict[2].name, "Library Preparation (PCR-enriched, Illumina)")
        self.assertEqual(matches_dict[3].name, "Library Preparation (PCR-enriched, Illumina)")

    def test_get_step_from_template_batch(self):
        # extract sheets from axiom sample preparation for test
        sheet_info = templates.AXIOM_PREPARATION_TEMPLATE["sheets info"]
        file = APP_DATA_ROOT / "Axiom_sample_preparation_v4_9_0.xlsx"
        sheets = {}
        for sheet in sheet_info:
            pd_sheet = pd.read_excel(file, sheet_name=sheet["name"], header=None)
            dataframe = pd_sheet.map(blank_and_nan_to_none).map(str_normalize)
            sheets[sheet["name"]] = SheetData(name=sheet["name"], dataframe=dataframe, headers=sheet["headers"])

        protocol = Protocol.objects.get(name="Axiom Sample Preparation")
        matches_dict, errors, warnings = get_step_from_template(protocol=protocol,
                                                                template_sheets=sheets,
                                                                template_sheet_definition=sheet_info,
                                                                batch_centric=True)
        
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])
        self.assertEqual(matches_dict[0].name, "Axiom Sample Preparation")
        self.assertEqual(len(matches_dict), 1)