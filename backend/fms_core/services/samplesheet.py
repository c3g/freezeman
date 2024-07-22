from django.templatetags.static import static

from io import BytesIO
from openpyxl.reader.excel import load_workbook

SAMPLESHEET_FILE_PATH = static("samplesheet_templates/SampleSheet_v2.xlsx")

def get_samplesheet(placement):
    """
    Prefill a samplesheet V2 using samples index information and return it as a Byte stream.

    Args:
        `placement`: List holding each lane mapping between the coordinate and the pooled sample occupying the coordinate.
                    exemple: [{"coordinates": "A01", "sample": "1041243"}, {"coordinates": "B01", "sample": "1414432"}, ...]
    
    Returns:
        `samplesheet`: Samplesheet file containing the prefiled samples and index in excel format.
        `errors`     : Errors raised during creation of the samplesheet file.
        `warnings`   : Warnings raised during creation of the samplesheet file.

    """
    out_stream = BytesIO()

    workbook = load_workbook(filename=SAMPLESHEET_FILE_PATH)
    
    workbook.save(out_stream)
    return out_stream.getvalue()