from typing import Generic, TypeVar
from openpyxl import Workbook

HeaderNameByID = TypeVar("HeaderNameByID", bound=dict[str, str])
Header_ID = TypeVar("Header_ID", bound=str)

class TemplateWorkbook(Workbook, Generic[HeaderNameByID, Header_ID]):

    def __init__(self, header_name_by_id: HeaderNameByID, header_ids: list[Header_ID]):
        super().__init__()

        self.HEADER_NAME_BY_ID = header_name_by_id
        self.HEADER_IDS = header_ids
        self.HEADERS = [header_name_by_id[header_id] for header_id in header_ids]
