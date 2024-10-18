from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter
from openpyxl.styles import PatternFill, Border, Side, Alignment, Protection, Font

def samplesheet_format():
    workbook = Workbook()

    workbook.create_sheet("Samplesheet")
    samplesheet = workbook["Samplesheet"]
    del workbook["Sheet"]

    workbook.create_sheet("Info")
    workbook.create_sheet("Index")

    index_cells = {}

    MAX_COLUMN = 5
    fillLightGray = PatternFill(start_color="b3cac7", end_color="b3cac7", fill_type="solid")
    fillOrange = PatternFill(start_color="e8a202", end_color="e8a202", fill_type="solid")

    samplesheet.append(["[Header]"])
    header_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["FileFormatVersion", "2"])
    samplesheet.append(["RunName", "@RunName"])
    samplesheet.append(["InstrumentPlatform", "NovaSeqXSeries"])
    samplesheet.append(["InstrumentType", "@InstrumentType"])
    samplesheet.append(["IndexOrientation", "Forward"])
    section_end_row = samplesheet.max_row
    for i in range(header_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillOrange

    samplesheet.append([])
    samplesheet.append(["[Reads]"])
    header_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["Read1Cycles", "@Read1Cycles"])
    samplesheet.cell(row=samplesheet.max_row, column=1).fill = fillOrange
    samplesheet.append(["Read2Cycles", "@Read2Cycles"])
    samplesheet.cell(row=samplesheet.max_row, column=1).fill = fillOrange
    samplesheet.append(["Index1Cycles", "@Index1Cycles"])
    samplesheet.cell(row=samplesheet.max_row, column=1).fill = fillOrange
    samplesheet.append(["Index2Cycles", "@Index2Cycles"])
    samplesheet.cell(row=samplesheet.max_row, column=1).fill = fillOrange
    section_end_row = samplesheet.max_row
    for i in range(header_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillOrange

    samplesheet.append([])
    samplesheet.append(["[Sequencing_Settings]"])
    header_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["LibraryPrepKits", "@LibraryPrepKits"])
    section_end_row = samplesheet.max_row
    for i in range(header_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillOrange

    samplesheet.append([])
    samplesheet.append(["[BCLConvert_Settings]"])
    header_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["SoftwareVersion", "@BCLConvert_SoftwareVersion"])
    samplesheet.append(["OverrideCycles", "@OverrideCycles"])
    samplesheet.append(["FastqCompressionFormat", "gzip"])
    section_end_row = samplesheet.max_row
    for i in range(header_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillOrange

    samplesheet.append([])
    samplesheet.append(["[BCLConvert_Data]"])
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["Lane", "Sample_ID", "Index", "Index2"])
    for i in range(1, 4+1):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillOrange

    samplesheet.append([])
    samplesheet.append(["[DragenGermline_Settings]"])
    header_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["SoftwareVersion", "@DragenGermline_SoftwareVersion"])
    samplesheet.append(["AppVersion", "@AppVersion"])
    samplesheet.append(["MapAlignOutFormat", "@MapAlignOutFormat"])
    samplesheet.append(["KeepFastq", "@KeepFastq"])
    section_end_row = samplesheet.max_row
    for i in range(header_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillOrange

    samplesheet.append([])
    samplesheet.append(["[DragenGermline_Data]"])
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["Sample_ID", "ReferenceGenomeDir", "VariantCallingMode"])
    for i in range(1, 3+1):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillOrange

    samplesheet_cells_validations: dict[str, list[DataValidation]] = {
        "RunName": [],
        "InstrumentType": [],
        "Read1Cycles": [
            DataValidation(type="whole", operator="greaterThan", formula1=0, allow_blank=False, showErrorMessage=True, errorTitle="Invalid Read1Cycles Value", error="Read1Cycles must be greater than 0")
        ],
        "Read2Cycles": [
            DataValidation(type="whole", operator="greaterThan", formula1=0, allow_blank=False, showErrorMessage=True, errorTitle="Invalid Read2Cycles Value", error="Read2Cycles must be greater than 0")
        ],
        "Index1Cycles": [
            DataValidation(type="whole", operator="greaterThanOrEqual", formula1=0, allow_blank=False, showErrorMessage=True, errorTitle="Invalid Index1Cycles Value", error="Index1Cycles must be greater than or equal to 0")
        ],
        "Index2Cycles": [
            DataValidation(type="whole", operator="greaterThanOrEqual", formula1=0, allow_blank=False, showErrorMessage=True, errorTitle="Invalid Index2Cycles Value", error="Index2Cycles must be greater than or equal to 0")
        ],
        "LibraryPrepKits": [],
        "SoftwareVersion": [],
        "OverrideCycles": [],
    }
    for row in samplesheet.rows:
        for cell in row:
            value = cell.value
            if value and value.startswith("@"):
                cell.value = ""
                if value[1:] in samplesheet_cells_validations:
                    for validation in samplesheet_cells_validations[value[1:]]:
                        samplesheet.add_data_validation(validation)
                        validation.add(cell)

    samplesheet.column_dimensions["A"].width = 25
    samplesheet.column_dimensions["B"].width = 20
    samplesheet.column_dimensions["C"].width = 20
    samplesheet.column_dimensions["D"].width = 20
    samplesheet.column_dimensions["E"].width = 20

    return workbook

wb = samplesheet_format()
wb.save("test.xlsx")