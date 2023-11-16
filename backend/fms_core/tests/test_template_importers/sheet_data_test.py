from django.test import TestCase

from fms_core.template_importer.sheet_data import SheetData
from fms_core import templates
from fms_core.template_importer._utils import blank_and_nan_to_none
from fms_core.tests.test_template_importers._utils import APP_DATA_ROOT
from fms_core.utils import str_normalize
from pandas import pandas as pd

class SheetDataTestCase(TestCase):
    def test_empty_rows_columns(self):
        # extract sheets from container creation for test
        sheet_info = templates.CONTAINER_CREATION_TEMPLATE["sheets info"]
        file = APP_DATA_ROOT / "Container_creation_empty_row_v4_2_0.xlsx"
        sheets = {}
        for sheet in sheet_info:
            pd_sheet = pd.read_excel(file, sheet_name=sheet["name"], header=None)
            dataframe = pd_sheet.applymap(blank_and_nan_to_none).applymap(str_normalize)
            sheets[sheet["name"]] = SheetData(name=sheet["name"], dataframe=dataframe, headers=sheet["headers"])
        
        sheet = sheets["ContainerCreation"]
        preview_info = sheet.generate_preview_info_from_rows_results(rows_results=sheet.rows_results)

        self.assertIsNotNone(sheet)
        self.assertTrue(sheet.base_errors)
        self.assertIsNotNone(sheet.empty_row)
        self.assertEquals(sheet.empty_row, 42)
        self.assertEquals(len(preview_info['headers']), 7)
