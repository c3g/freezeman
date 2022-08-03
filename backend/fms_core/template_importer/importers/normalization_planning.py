from fms_core.template_prefiller.prefiller import PrefillTemplateFromDict
from fms_core.template_importer.row_handlers.normalization_planning import NormalizationPlanningRowHandler
from fms_core.template_prefiller._utils import load_position_dict
from fms_core.templates import NORMALIZATION_PLANNING_TEMPLATE, NORMALIZATION_TEMPLATE

from fms_core.models import IdGenerator, Container
from ...containers import CONTAINER_KIND_SPECS

from ._generic import GenericImporter
from .._utils import float_to_decimal_and_none, zip_files
from fms_core.utils import str_cast_and_normalize, str_cast_and_normalize_lower

from django.conf import settings

from io import BytesIO
from datetime import datetime
from typing import Union

FIXED_FORMAT = "Fixed (plates)"
MOBILE_FORMAT = "Mobile (tubes)"
VALID_ROBOT_FORMATS = [FIXED_FORMAT, MOBILE_FORMAT]

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

        mapping_rows_template = []
        src_format = []
        dst_format = []
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
                    'kind': str_cast_and_normalize_lower(row_data['Destination Container Kind']),
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

            robot = {
                'input_format': str_cast_and_normalize(row_data['Robot input format']),
                'output_format': str_cast_and_normalize(row_data['Robot output format']),
            }

            normalization_kwargs = dict(
                source_sample=source_sample,
                destination_sample=destination_sample,
                measurements=measurements,
                robot=robot
            )

            (result, row_mapping) = self.handle_row(
                row_handler_class=NormalizationPlanningRowHandler,
                sheet=sheet,
                row_i=row_id,
                **normalization_kwargs,
            )

            mapping_rows_template.append(row_mapping)
            src_format.append(robot["input_format"])
            dst_format.append(robot["output_format"])

        if not self.dry_run:
            # Populate files
            
            # Temporary test. Make sure all the format for input and output are the same
            if len(set(src_format)) != 1:
                self.base_errors.append(f"All Robot input formats need to be identical.")
            if len(set(dst_format)) != 1:
                self.base_errors.append(f"All Robot output formats need to be identical.")


            # Create robot file and complete mapping_rows_template with the 
            robot_filename = self.prepare_robot_file(mapping_rows_template, src_format[0], dst_format[0])

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
            
    def prepare_robot_file(self, rows_data, src_format, dst_format) -> Union[BytesIO, None]:
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
        FIRST_COORD_AXIS = 0
        SECOND_COORD_AXIS = 1
        TUBE = "tube"
        ROBOT_TUBE_RACK = "tube rack 4x6"

        def get_destination_container_barcode(row_data):
            return row_data["Destination Container Barcode"]
        def get_destination_contairer_coord(row_data):
            return row_data["Destination Container Barcode"]
        
        def get_robot_destination_container(row_data):
            return row_data["Robot Destination Container"]
        def get_robot_destination_coord(row_data) -> str:
            return row_data["Robot Destination Coord"]

        def get_placement_container_barcode(row_data) -> str:
            return row_data["Destination Container Barcode"] if row_data["Destination Container Kind"] != TUBE else row_data["Destination Parent Container Barcode"]
        def get_placement_container_coord(row_data) -> str:
            return row_data["Destination Container Coord"] if row_data["Destination Container Kind"] != TUBE else row_data["Destination Parent Container Coord"]

        def convert_to_numerical_robot_coord(coord_spec, fms_coord) -> int:
            first_axis_len = len(coord_spec[FIRST_COORD_AXIS])
            second_axis_coord = int(fms_coord[1:])
            return (ord(fms_coord[:1]) - 96) + (first_axis_len * (second_axis_coord - 1))


        mapping_dest_containers = {}
        mapping_src_containers = {}
        coord_spec_by_barcode = {}

        # The robot container in Mobile format are "tube racks 4x6"
        default_mobile_spec = CONTAINER_KIND_SPECS[ROBOT_MOBILE_TUBE_RACK].coordinate_spec
        count_default_coords = len(default_mobile_spec[FIRST_COORD_AXIS]) * len(default_mobile_spec[SECOND_COORD_AXIS])
        coord_spec_by_barcode = {}

        ############################################# Destination section ###################################################

        dest_containers = set((get_placement_container_barcode(row_data), row_data["Destination Container Kind"]) for row_data in rows_data)

        if dst_format == FIXED_FORMAT: ############## condition dst Fixed (plates) + any src ##############
            # Map container spec to destination container barcode
            for barcode, kind in dest_containers:
                coord_spec_by_barcode[barcode] = CONTAINER_KIND_SPECS[kind].coordinate_spec if kind != TUBE \
                                                 else CONTAINER_KIND_SPECS[ROBOT_FIXED_TUBE_RACK].coordinate_spec
            # Map destination container barcode to robot destination barcodes
            for i, barcode in enumerate(dest_containers):
                mapping_dest_containers[barcode] = "dest" + str(i)

            # Add robot barcode to the rows_data
            for row_data in rows_data:
                row_data["Robot Destination Container"] = mapping_dest_containers[get_placement_container_barcode(row_data)]
            # Add robot dest coord to the rows_data
            for row_data in rows_data:
                row_data["Robot Destination Coord"] = convert_to_numerical_robot_coord(coord_spec_by_barcode(row_data["Destination Container Barcode"]),
                                                                                       row_data["Destination Container Coord"])
        
            # Sort incomming list using the destination plates barcodes and coords
            rows_data = sorted(rows_data,
                               key=lambda x: (get_robot_destination_container(x), get_robot_destination_coord(x)),
                               reverse=False)

            src_containers = set(row_data["Source Container Barcode"] for row_data in rows_data)

            if src_format == FIXED_FORMAT: ############## condition src Fixed (plates) ##############
                # Map container spec to source container barcode
                for barcode in src_containers:
                    container = Container.objects.get(barcode=barcode)
                    coord_spec_by_barcode[barcode] = CONTAINER_KIND_SPECS[container.kind].coordinate_spec

                # Map source container barcode to robot source barcodes
                for i, barcode in enumerate(src_containers):
                    mapping_src_containers[barcode] = "src" + str(i)

                # Add robot barcode to the rows_data
                for row_data in rows_data:
                    row_data["Robot Source Container"] = mapping_src_containers[row_data["Source Container Barcode"]]

                # Add robot src coord to the sorted rows_data
                for row_data in rows_data:
                    row_data["Robot Source Coord"] = convert_to_numerical_robot_coord(coord_spec_by_barcode(row_data["Source Container Barcode"]),
                                                                                      row_data["Source Container Coord"])
            elif src_format == MOBILE_FORMAT: ############## condition src Mobile (tubes) ##############                
                # Map destination container barcode to robot destination barcodes
                for i, barcode in enumerate(src_containers):
                    mapping_src_containers[barcode] = "src" + str((i / count_default_coords) + 1)

                # Add robot barcode to the rows_data
                for row_data in rows_data:
                    row_data["Robot Source Container"] = mapping_src_containers[row_data["Source Container Barcode"]]
                
                # Add robot src coord to the sorted rows_data
                for i, row_data in enumerate(rows_data):
                    row_data["Robot Source Coord"] = str(i % count_default_coords)

        elif dst_format == MOBILE_FORMAT and src_format == FIXED_FORMAT: ############## condition dst Mobile (tubes) + condition src Fixed (plates) ##############
            # Use src containers coords to order the lines
            src_containers = set(row_data["Source Container Barcode"] for row_data in rows_data)
            # Map container spec to destination container barcode
            for barcode in src_containers:
                container = Container.objects.get(barcode=barcode)
                coord_spec_by_barcode[barcode] = CONTAINER_KIND_SPECS[container.kind].coordinate_spec if container.kind != TUBE \
                                                 else CONTAINER_KIND_SPECS[ROBOT_FIXED_TUBE_RACK].coordinate_spec
            # Map source container barcode to robot source barcodes
            for i, barcode in enumerate(src_containers):
                mapping_src_containers[barcode] = "src" + str(i) # !!!!!!!! Need to think about tubes also ...
            # Add robot barcode to the rows_data
            for row_data in rows_data:
                row_data["Robot Source Container"] = mapping_src_containers[row_data["Source Container Barcode"]]
            # Add robot dest coord to the rows_data
            for row_data in rows_data:
                row_data["Robot Destination Coord"] = convert_to_numerical_robot_coord(coord_spec_by_barcode(row_data["Destination Container Barcode"]),
                                                                                       row_data["Destination Container Coord"])
        
            # Sort incomming list using the destination plates barcodes and coords
            rows_data = sorted(rows_data,
                               key=lambda x: (get_robot_destination_container(x), get_robot_destination_coord(x)),
                               reverse=False)

            count_coordinates_dest = len(default_mobile_spec[FIRST_COORD_AXIS]) * len(default_mobile_spec[SECOND_COORD_AXIS])


            # Map destination container barcode to robot destination barcodes
            for i, (barcode, _) in enumerate(dest_containers):
                mapping_dest_containers[barcode] = "dest" + str((i / count_default_coords) + 1)
            # Add robot barcode to the rows_data
            for row_data in rows_data:
                row_data["Robot Destination Container"] = mapping_dest_containers[row_data["Destination Container Barcode"]]
            
            # Add robot dest coord to the rows_data
            for i, row_data in enumerate(rows_data):
                row_data["Robot Destination Coord"] = str(i % count_default_coords)

        elif dst_format == MOBILE_FORMAT and src_format == MOBILE_FORMAT: ############## condition dst Mobile (tubes) + condition src Mobile (tubes) ##############
            count_coordinates_dest = len(default_mobile_spec[FIRST_COORD_AXIS]) * len(default_mobile_spec[SECOND_COORD_AXIS])

            # Map destination container barcode to robot destination barcodes
            for i, (barcode, _) in enumerate(dest_containers):
                mapping_dest_containers[barcode] = "dest" + str((i / count_default_coords) + 1)
            # Add robot barcode to the rows_data
            for row_data in rows_data:
                row_data["Robot Destination Container"] = mapping_dest_containers[row_data["Destination Container Barcode"]]
            
            # Add robot dest coord to the rows_data
            for i, row_data in enumerate(rows_data):
                row_data["Robot Destination Coord"] = str(i % count_default_coords)

            src_containers = set(row_data["Source Container Barcode"] for row_data in rows_data)
            
            # Map destination container barcode to robot destination barcodes
            for i, barcode in enumerate(src_containers):
                mapping_src_containers[barcode] = "src" + str((i / count_default_coords) + 1)

            # Add robot barcode to the rows_data
            for row_data in rows_data:
                row_data["Robot Source Container"] = mapping_src_containers[row_data["Source Container Barcode"]]
            
            # Add robot src coord to the sorted rows_data
            for i, row_data in enumerate(rows_data):
                row_data["Robot Source Coord"] = str(i % count_default_coords)
        else:
            pass # This should never happen









        ############################################# Source section ###################################################

        src_containers = set(row_data["Source Container Barcode"] for row_data in rows_data)

        if src_format == FIXED_FORMAT: ############## condition src Fixed (plates) ##############
            # Map container spec to source container barcode
            for barcode in src_containers:
                container = Container.objects.get(barcode=barcode)
                coord_spec_by_barcode[barcode] = CONTAINER_KIND_SPECS[container.kind].coordinate_spec

            # Map source container barcode to robot source barcodes
            for i, barcode in enumerate(src_containers):
                mapping_src_containers[barcode] = "src" + str(i)

            # Add robot barcode to the rows_data
            for row_data in rows_data: 
                row_data["Robot Source Container"] = mapping_src_containers[row_data["Source Container Barcode"]]

            # Add robot src coord to the sorted rows_data
            for row_data in rows_data:
                row_data["Robot Source Coord"] = convert_to_numerical_robot_coord(coord_spec_by_barcode(row_data["Source Container Barcode"]),
                                                                                  row_data["Source Container Coord"])
        elif src_format == MOBILE_FORMAT: ############## condition src Mobile (tubes) ##############
            count_coordinates_src = len(default_mobile_spec[FIRST_COORD_AXIS]) * len(default_mobile_spec[SECOND_COORD_AXIS])
            
            # Map destination container barcode to robot destination barcodes
            for i, barcode in enumerate(src_containers):
                mapping_src_containers[barcode] = "src" + str((i / count_coordinates_src) + 1)

            # Add robot barcode to the rows_data
            for row_data in rows_data:
                row_data["Robot Source Container"] = mapping_src_containers[row_data["Source Container Barcode"]]
            
            # Add robot src coord to the sorted rows_data
            for i, row_data in enumerate(rows_data):
                row_data["Robot Source Coord"] = str(i % count_coordinates_dest)
