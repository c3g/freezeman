from django.test import TestCase

from fms_core.template_importer.sheet_data import SheetData
from fms_core import templates
from fms_core.template_importer._utils import blank_and_nan_to_none
from fms_core.tests.test_template_importers._utils import APP_DATA_ROOT
from fms_core.utils import str_normalize
from pandas import pandas as pd

class SheetDataTestCase(TestCase):
    def test_empty_rows(self):
        # extract sheets from library prep for test
        sheet_info = templates.CONTAINER_CREATION_TEMPLATE["sheets info"]
        file = APP_DATA_ROOT / "Container_creation_empty_row_v4_2_0.xlsx"
        sheets = {}
        for sheet in sheet_info:
            pd_sheet = pd.read_excel(file, sheet_name=sheet["name"], header=None)
            dataframe = pd_sheet.applymap(blank_and_nan_to_none).applymap(str_normalize)
            sheets[sheet["name"]] = SheetData(name=sheet["name"], dataframe=dataframe, headers=sheet["headers"])
        
        sheet = sheets["ContainerCreation"]
        self.assertIsNotNone(sheet)
        self.assertTrue(sheet.base_errors)
        self.assertIsNotNone(sheet.empty_row)