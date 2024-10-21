from dataclasses import dataclass
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter
from openpyxl.styles import PatternFill, Border, Side
from openpyxl.utils.cell import coordinate_from_string, column_index_from_string

@dataclass
class BCLConvert_Datum:
    Lane: str
    Sample_ID: str
    Index: str
    Index2: str

@dataclass
class DragenGermline_Datum:
    Sample_ID: str
    ReferenceGenomeDir: str
    VariantCallingMode: str

def generate_samplesheet_workbook(BCLConvert_Data: list[BCLConvert_Datum], DragenGermline_Data: list[DragenGermline_Datum]) -> Workbook:
    workbook = Workbook()

    workbook.create_sheet("Samplesheet")
    samplesheet = workbook["Samplesheet"]
    del workbook["Sheet"]

    workbook.create_sheet("Info")
    workbook.create_sheet("Index")

    MAX_COLUMN = 5
    fillSectionName = PatternFill(start_color="b3cac7", end_color="b3cac7", fill_type="solid")
    fillKey = PatternFill(start_color="e8a202", end_color="e8a202", fill_type="solid")
    fillPrefilled = PatternFill(start_color="dee7e5", end_color="dee7e5", fill_type="solid")
    fillBlank = PatternFill(start_color="e8f2a1", end_color="e8f2a1", fill_type="solid")

    samplesheet.append(["[Header]"])
    section_start_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillSectionName
    samplesheet.append(["FileFormatVersion", "@FileFormatVersion"])
    samplesheet.append(["RunName", "@RunName"])
    MAX_RUN_NAME_LENGTH = 255
    samplesheet.append(["InstrumentPlatform", "@InstrumentPlatform"])
    # samplesheet.append(["InstrumentType", "@InstrumentType"])
    samplesheet.append(["IndexOrientation", "@IndexOrientation"])
    section_end_row = samplesheet.max_row
    for i in range(section_start_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillKey

    samplesheet.append([])
    samplesheet.append(["[Reads]"])
    section_start_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillSectionName
    samplesheet.append(["Read1Cycles", "@Read1Cycles"])
    samplesheet.append(["Read2Cycles", "@Read2Cycles"])
    samplesheet.append(["Index1Cycles", "@Index1Cycles"])
    samplesheet.append(["Index2Cycles", "@Index2Cycles"])
    section_end_row = samplesheet.max_row
    for i in range(section_start_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillKey

    samplesheet.append([])
    samplesheet.append(["[Sequencing_Settings]"])
    section_start_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillSectionName
    samplesheet.append(["LibraryPrepKits", "@LibraryPrepKits"])
    library_kit_cell = samplesheet.cell(row=samplesheet.max_row, column=2)
    section_end_row = samplesheet.max_row
    for i in range(section_start_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillKey

    samplesheet.append([])
    samplesheet.append(["[BCLConvert_Settings]"])
    section_start_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillSectionName
    samplesheet.append(["SoftwareVersion", "@BCLConvert_SoftwareVersion"])
    samplesheet.append(["AdapterRead1", "@AdapterRead1"])
    samplesheet.append(["AdapterRead2", "@AdapterRead2"])
    samplesheet.append(["OverrideCycles", "@OverrideCycles"])
    samplesheet.append(["FastqCompressionFormat", "@FastqCompressionFormat"])
    section_end_row = samplesheet.max_row
    for i in range(section_start_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillKey

    samplesheet.append([])
    samplesheet.append(["[BCLConvert_Data]"])
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillSectionName
    samplesheet.append(["Lane", "Sample_ID", "Index", "Index2"])
    for i in range(1, 4+1):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillKey
    for datum in BCLConvert_Data:
        samplesheet.append([datum.Lane, datum.Sample_ID, datum.Index, datum.Index2])
        for i in range(1, 4+1):
            samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillPrefilled

    samplesheet.append([])
    samplesheet.append(["[DragenGermline_Settings]"])
    section_start_row = samplesheet.max_row
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillSectionName
    samplesheet.append(["SoftwareVersion", "@DragenGermline_SoftwareVersion"])
    samplesheet.append(["AppVersion", "@AppVersion"])
    samplesheet.append(["MapAlignOutFormat", "@MapAlignOutFormat"])
    samplesheet.append(["KeepFastq", "@KeepFastq"])
    section_end_row = samplesheet.max_row
    for i in range(section_start_row+1, section_end_row+1):
        samplesheet.cell(row=i, column=1).fill = fillKey

    samplesheet.append([])
    samplesheet.append(["[DragenGermline_Data]"])
    for i in range(1, MAX_COLUMN):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillSectionName
    samplesheet.append(["Sample_ID", "ReferenceGenomeDir", "VariantCallingMode"])
    for i in range(1, 3+1):
        samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillKey
    for datum in DragenGermline_Data:
        samplesheet.append([datum.Sample_ID, datum.ReferenceGenomeDir, datum.VariantCallingMode])
        for i in range(1, 3+1):
            samplesheet.cell(row=samplesheet.max_row, column=i).fill = fillPrefilled

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
        "LibraryPrepKits": [
            DataValidation(type="list", formula1='"IlluminaDNAPCRFree"', allow_blank=False, showErrorMessage=True, errorTitle="Invalid LibraryPrepKits Value", error="Only IlluminaDNAPCRFree is supported")
        ],
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
        "ReferenceGenomeDir": [],
        "VariantCallingMode": [
            DataValidation(type="list", formula1='"None,SmallVariantCaller,AllVariantCallers"', allow_blank=False, showErrorMessage=True, errorTitle="Invalid VariantCallingMode Value", error="Only None, SmallVariantCaller, AllVariantCallers are supported")
        ]
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
        "LibraryPrepKits": "IlluminaDNAPCRFree",
        # [BCLConvert_Settings]
        "BCLConvert_SoftwareVersion": "",
        "AdapterRead1": f'=IF({library_kit_cell.coordinate}="IlluminaDNAPCRFree","CTGTCTCTTATACACATCT+ATGTGTATAAGAGACA","")',
        "AdapterRead2": f'=IF({library_kit_cell.coordinate}="IlluminaDNAPCRFree","CTGTCTCTTATACACATCT+ATGTGTATAAGAGACA","")',
        "OverrideCycles": "",
        "FastqCompressionFormat": "gzip",
        # [BCLConvert_Data]
        # [DragenGermline_Settings]
        "DragenGermline_SoftwareVersion": "",
        "AppVersion": "",
        "MapAlignOutFormat": "none",
        "KeepFastq": "TRUE",
        # [DragenGermline_Data]
        "ReferenceGenomeDir": "",
        "VariantCallingMode": "None"
    }
    for row in samplesheet.rows:
        for cell in row:
            value = cell.value
            if value and value.startswith("@"):
                key = value[1:]
                cell.value = samplesheet_cells_default_values.get(key, "UNKNOWN_DEFAULT_VALUE")
                cell.fill = fillBlank
                for validation in samplesheet_cells_validations.get(key, []):
                    samplesheet.add_data_validation(validation)
                    validation.add(cell)

    samplesheet.column_dimensions["A"].width = 25
    samplesheet.column_dimensions["B"].width = 20
    samplesheet.column_dimensions["C"].width = 20
    samplesheet.column_dimensions["D"].width = 20
    samplesheet.column_dimensions["E"].width = 20

    bounding_range = samplesheet.calculate_dimension().split(":")
    bounding_rate = coordinate_from_string(bounding_range[0]), coordinate_from_string(bounding_range[1])
    bounding_range = (column_index_from_string(bounding_rate[0][0]), int(bounding_rate[0][1])), (column_index_from_string(bounding_rate[1][0]), int(bounding_rate[1][1]))
    for i in range(bounding_range[0][0], bounding_range[1][0]+1):
        for j in range(bounding_range[0][1], bounding_range[1][1]+1):
            cell = samplesheet.cell(row=j, column=i)
            cell.border = Border(
                left=Side(border_style="thin", color="000000"),
                right=Side(border_style="thin", color="000000"),
                top=Side(border_style="thin", color="000000"),
                bottom=Side(border_style="thin", color="000000"),
            )

    return workbook

BCLConvert_Data = [
    BCLConvert_Datum(Lane="1", Sample_ID="1041243", Index="ATCG", Index2="GCTA"),
    BCLConvert_Datum(Lane="2", Sample_ID="1414432", Index="GCTA", Index2="ATCG"),
    BCLConvert_Datum(Lane="3", Sample_ID="1414432", Index="GCTA", Index2="ATCG"),
    BCLConvert_Datum(Lane="4", Sample_ID="1414432", Index="GCTA", Index2="ATCG"),
    BCLConvert_Datum(Lane="5", Sample_ID="1414432", Index="GCTA", Index2="ATCG"),
]

DragenGermline_Data = [
    DragenGermline_Datum(Sample_ID="1041243", ReferenceGenomeDir="@ReferenceGenomeDir", VariantCallingMode="@VariantCallingMode"),
    DragenGermline_Datum(Sample_ID="1414432", ReferenceGenomeDir="@ReferenceGenomeDir", VariantCallingMode="@VariantCallingMode"),
    DragenGermline_Datum(Sample_ID="1414432", ReferenceGenomeDir="@ReferenceGenomeDir", VariantCallingMode="@VariantCallingMode"),
    DragenGermline_Datum(Sample_ID="1414432", ReferenceGenomeDir="@ReferenceGenomeDir", VariantCallingMode="@VariantCallingMode"),
    DragenGermline_Datum(Sample_ID="1414432", ReferenceGenomeDir="@ReferenceGenomeDir", VariantCallingMode="@VariantCallingMode"),
]

wb = generate_samplesheet_workbook(BCLConvert_Data, DragenGermline_Data)
wb.save("test.xlsx")