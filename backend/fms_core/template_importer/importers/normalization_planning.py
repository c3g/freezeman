from datetime import datetime

from fms_core.template_importer.row_handlers.normalization_planning import NormalizationPlanningRowHandler
from fms_core.templates import NORMALIZATION_PLANNING_TEMPLATE, NORMALIZATION_TEMPLATE
from fms_core.models import IdGenerator

from ._generic import GenericImporter
from .._utils import float_to_decimal_and_none, zip_files
from fms_core.utils import str_cast_and_normalize
from fms_core.template_prefiller.prefiller import PrefillTemplateFromDict

import tempfile
import csv
from typing import Union

class NormalizationPlanningImporter(GenericImporter):
    """
         Template importer for the Normalization Protocol.

         Args:
             `sheet`: The template to ingest.

         Returns:
             A detailed validation of the data trying to be ingested as a result.
    """

    SHEETS_INFO = NORMALIZATION_PLANNING_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        # Maybe useful ?
        pass

    def import_template_inner(self):
        sheet = self.sheets['Normalization']

        mapping_rows_template = {}
        # For each row initialize the object that is going to be prefilled in the normalization template
        for row_id, row_data in enumerate(sheet.rows):
            source_sample = {
                'name': str_cast_and_normalize(row_data['Sample Name']),
                'container': {'barcode': str_cast_and_normalize(row_data['Source Container Barcode'])},
                'coordinates': str_cast_and_normalize(row_data['Source Container Coord']),
            }

            destination_sample = {
                'coordinates': str_cast_and_normalize(row_data['Destination Container Coord']),
                'container': {
                    'barcode': str_cast_and_normalize(row_data['Destination Container Barcode']),
                    'name': str_cast_and_normalize(row_data['Destination Container Name']),
                    'kind': str_cast_and_normalize(row_data['Destination Container Kind']),
                    'coordinates': str_cast_and_normalize(row_data['Destination Parent Container Coord']),
                    'parent_barcode': str_cast_and_normalize(row_data['Destination Parent Container Barcode']),
                },
            }

            measurements = {
                'volume': float_to_decimal_and_none(row_data['Final Volume (uL)']),
                'na_quantity': float_to_decimal_and_none(row_data['NA Quantity (ng)']),
                'concentration_ngul': float_to_decimal_and_none(row_data['Norm. Conc. (ng/uL)']),
                'concentration_nm': float_to_decimal_and_none(row_data['Norm. Conc. (nM)']),
            }

            normalization_kwargs = dict(
                source_sample=source_sample,
                destination_sample=destination_sample,
                measurements=measurements
            )

            (result, row_mapping) = self.handle_row(
                row_handler_class=NormalizationPlanningRowHandler,
                sheet=sheet,
                row_i=row_id,
                **normalization_kwargs,
            )

            mapping_rows_template.append(row_mapping)

        if not self.dry_run:
            # TODO: get robot csv file and robot updated columns
            # mapping_rows_template, file = dummy_function_csv_robot(mapping_rows_template)

            output_prefilled_template = PrefillTemplateFromDict(NORMALIZATION_TEMPLATE, mapping_rows_template)

            output_prefilled_template_name = "/".join(NORMALIZATION_TEMPLATE["identity"]["file"].split("/")[-1:])

            files_to_zip = [
                {
                    'name': output_prefilled_template_name,
                    'content': output_prefilled_template,
                },
                {
                    'name': 'Normalization_for_robot.csv',
                    'content': output_prefilled_template
                }
            ]

            output_zip_name = f"Normalization_planning_output_{datetime.today().strftime('%Y-%m-%d')}_{IdGenerator.objects.create().id}"

            # Zip files
            zip_buffer = zip_files(output_zip_name, files_to_zip)

            self.output_file = {
                'name': output_zip_name + '.zip',
                'content': zip_buffer.getvalue()
            }
    def prepare_robot_file(row_data) -> Union[str, None]:
        """
        This function takes the content of the Normalization planning template as input to create
        a csv file that contains the required configuration for the robot execution of the
        normalization in the lab.

        Args:
            row_data: A list of row_data extracted by the importer and already validated by the row_handler.
                      The row_data content will be modified and the robot barcode and coordinates will
                      be added for input and output.
        Returns:
            A string containing the path to the created robot file or None if an error occured.
        """
        
