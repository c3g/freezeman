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

    MAX_COLUMN = 5
    fillLightGray = PatternFill(start_color="b3cac7", end_color="b3cac7", fill_type="solid")
    fillOrange = PatternFill(start_color="e8a202", end_color="e8a202", fill_type="solid")

    samplesheet.append(["[Header]"])
    section_start_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["FileFormatVersion", "@FileFormatVersion"])
    samplesheet.append(["RunName", "@RunName"])
    run_name_cell = samplesheet.cell(row=samplesheet.max_row, column=2)
    MAX_RUN_NAME_LENGTH = 255
    samplesheet.append(["InstrumentPlatform", "@InstrumentPlatform"])
    # samplesheet.append(["InstrumentType", "@InstrumentType"])
    samplesheet.append(["IndexOrientation", "@IndexOrientation"])
    section_end_row = samplesheet.max_row
    for i in range(section_start_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillOrange

    samplesheet.append([])
    samplesheet.append(["[Reads]"])
    section_start_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["Read1Cycles", "@Read1Cycles"])
    samplesheet.append(["Read2Cycles", "@Read2Cycles"])
    samplesheet.append(["Index1Cycles", "@Index1Cycles"])
    samplesheet.append(["Index2Cycles", "@Index2Cycles"])
    section_end_row = samplesheet.max_row
    for i in range(section_start_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillOrange

    samplesheet.append([])
    samplesheet.append(["[Sequencing_Settings]"])
    section_start_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["LibraryPrepKits", "@LibraryPrepKits"])
    section_end_row = samplesheet.max_row
    for i in range(section_start_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillOrange

    samplesheet.append([])
    samplesheet.append(["[BCLConvert_Settings]"])
    section_start_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["SoftwareVersion", "@BCLConvert_SoftwareVersion"])
    samplesheet.append(["AdapterRead1", "@AdapterRead1"])
    samplesheet.append(["AdapterRead2", "@AdapterRead2"])
    samplesheet.append(["OverrideCycles", "@OverrideCycles"])
    samplesheet.append(["FastqCompressionFormat", "@FastqCompressionFormat"])
    section_end_row = samplesheet.max_row
    for i in range(section_start_row+1, section_end_row+1):
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
    section_start_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["SoftwareVersion", "@DragenGermline_SoftwareVersion"])
    samplesheet.append(["AppVersion", "@AppVersion"])
    samplesheet.append(["MapAlignOutFormat", "@MapAlignOutFormat"])
    samplesheet.append(["KeepFastq", "@KeepFastq"])
    section_end_row = samplesheet.max_row
    for i in range(section_start_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillOrange

    samplesheet.append([])
    samplesheet.append(["[DragenGermline_Data]"])
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillLightGray
    samplesheet.append(["Sample_ID", "ReferenceGenomeDir", "VariantCallingMode"])
    for i in range(1, 3+1):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillOrange

    samplesheet_cells_validations: dict[str, list[DataValidation]] = {
        # [Header]
        "FileFormatVersion": [
            DataValidation(type="whole", operator="equal", formula1=2, allow_blank=False, showErrorMessage=True, errorTitle="Invalid FileFormatVersion Value", error="FileFormatVersion must always be 2")
        ],
        "RunName": [
            DataValidation(type="textLength", operator="lessThanOrEqual", formula1=MAX_RUN_NAME_LENGTH, allow_blank=True, showErrorMessage=True, errorTitle="Invalid RunName Length", error=f"RunName must be less than or equal to {MAX_RUN_NAME_LENGTH} characters")
        ],
        "InstrumentPlatform": [
            DataValidation(type="list", formula1='"NovaSeqXSeries"', allow_blank=False, showErrorMessage=True, errorTitle="Invalid InstrumentPlatform Value", error="Only NovaSeqXSeries is supported")
        ],
        # "InstrumentType": [],
        "IndexOrientation": [
            DataValidation(type="list", formula1='"Forward"', allow_blank=False, showErrorMessage=True, errorTitle="Invalid IndexOrientation Value", error="Only Forward is supported")
        ],
        # [Reads]
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
        # [Sequencing_Settings]
        "LibraryPrepKits": [],
        # [BCLConvert_Settings]
        "BCLConvert_SoftwareVersion": [],
        "AdapterRead1": [],
        "AdapterRead2": [],
        "OverrideCycles": [],
        "FastqCompressionFormat": [
            DataValidation(type="list", formula1='"gzip"', allow_blank=False, showErrorMessage=True, errorTitle="Invalid FastqCompressionFormat Value", error="Only gzip is supported")
        ],
        # [BCLConvert_Data]
        # [DragenGermline_Settings]
        "DragenGermline_SoftwareVersion": [],
        "AppVersion": [],
        "MapAlignOutFormat": [
            DataValidation(type="list", formula1='"bam,cram,none"', allow_blank=False, showErrorMessage=True, errorTitle="Invalid MapAlignOutFormat Value", error="Only bam, cram, none are supported")
        ],
        "KeepFastq": [
            DataValidation(type="list", formula1='"TRUE,FALSE"', allow_blank=False, showErrorMessage=True, errorTitle="Invalid KeepFastq Value", error="Only TRUE, FALSE are supported")
        ],
        # [DragenGermline_Data]
    }
    samplesheet_cells_default_values: dict[str, str] = {
        # [Header]
        "FileFormatVersion": "2",
        "RunName": "",
        "InstrumentPlatform": "NovaSeqXSeries",
        "InstrumentType": "",
        "IndexOrientation": "Forward",
        # [Reads]
        "Read1Cycles": "",
        "Read2Cycles": "",
        "Index1Cycles": "",
        "Index2Cycles": "",
        # [Sequencing_Settings]
        "LibraryPrepKits": "",
        # [BCLConvert_Settings]
        "BCLConvert_SoftwareVersion": "",
        "AdapterRead1": "",
        "AdapterRead2": "",
        "OverrideCycles": "",
        "FastqCompressionFormat": "gzip",
        # [BCLConvert_Data]
        # [DragenGermline_Settings]
        "DragenGermline_SoftwareVersion": "",
        "AppVersion": "",
        "MapAlignOutFormat": "none",
        "KeepFastq": "TRUE",
        # [DragenGermline_Data]
    }
    for row in samplesheet.rows:
        for cell in row:
            value = cell.value
            if value and value.startswith("@"):
                value = value[1:]
                cell.value = samplesheet_cells_default_values.get(value, "UNKNOWN_DEFAULT_VALUE")
                if value in samplesheet_cells_validations:
                    for validation in samplesheet_cells_validations[value]:
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