from fms_core.template_prefiller.prefiller import PrefillTemplateFromDict
from fms_core.template_importer.row_handlers.normalization_planning import NormalizationPlanningRowHandler
from fms_core.template_importer._constants import SAMPLE_CHOICE, LIBRARY_CHOICE
from fms_core.templates import NORMALIZATION_PLANNING_TEMPLATE, NORMALIZATION_TEMPLATE

from fms_core.models import Container
from ...containers import CONTAINER_KIND_SPECS
from fms_core.services.id_generator import get_unique_id

from ._generic import GenericImporter
from .._utils import float_to_decimal_and_none, zip_files
from fms_core.utils import str_cast_and_normalize, str_cast_and_normalize_lower, unique

from io import BytesIO
from datetime import datetime
import decimal

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
        pass

    def import_template_inner(self):
        sheet = self.sheets['Normalization']

        mapping_rows_template = []
        norm_choice = []
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
                'norm_choice': str_cast_and_normalize(row_data['Robot Norm Choice']),
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
            norm_choice.append(robot["norm_choice"])

        if not self.dry_run:
            # Populate files
            
            # Make sure all the normalization choice and formats for outputs are the same
            if len(set(norm_choice)) != 1:
                self.base_errors.append(f"All Robot norm choice need to be identical.")

            # Create robot file and complete mapping_rows_template with the 
            robot_files, updated_mapping_rows = self.prepare_robot_file(mapping_rows_template, norm_choice[0])

            output_prefilled_template = PrefillTemplateFromDict(NORMALIZATION_TEMPLATE, updated_mapping_rows)

            output_prefilled_template_name = "/".join(NORMALIZATION_TEMPLATE["identity"]["file"].split("/")[-1:])

            files_to_zip = [{'name': output_prefilled_template_name,
                             'content': output_prefilled_template,}]
            files_to_zip.extend(robot_files)

            output_zip_name = f"Normalization_planning_output_{datetime.today().strftime('%Y-%m-%d')}_{str(get_unique_id())}"

            # Zip files
            zip_buffer = zip_files(output_zip_name, files_to_zip)

            self.output_file = {
                'name': output_zip_name + '.zip',
                'content': zip_buffer.getvalue()
            }
            
    def prepare_robot_file(self, rows_data, norm_choice):
        """
        This function takes the content of the Normalization planning template as input to create
        a csv file that contains the required configuration for the robot execution of the
        normalization in the lab.

        Args:
            row_data: A list of row_data extracted by the importer and already validated by the row_handler.
            norm_choice: The choice between sample or library robot output files.
            
        Returns:
            A tuple containing : a list of dict that contains robot csv files and an updated version of the row_data (sorted and completed).
        """
        FIRST_COORD_AXIS = 0
        TUBE = "tube"

        if norm_choice == LIBRARY_CHOICE:
            ROBOT_SRC_PREFIX = "Source"
            ROBOT_DST_PREFIX = "Dil"
        elif norm_choice == SAMPLE_CHOICE:
            ROBOT_SRC_PREFIX = "Src"
            ROBOT_DST_PREFIX = "Dst"

        def build_source_container_dict(rows_data):
            container_dict = {}
            for row_data in rows_data:
                container = Container.objects.get(barcode=row_data["Source Container Barcode"])
                container_dict[container.barcode] = (container,
                                                     container.location.barcode if container.location else None,
                                                     container.location.kind if container.location else None)
            return container_dict

        def get_robot_destination_container(row_data) -> str:
            return row_data["Robot Destination Container"]
        def get_robot_destination_coord(row_data) -> str:
            return row_data["Robot Destination Coord"]

        def get_source_container_barcode(row_data, container_dict) -> str:
            container, parent_barcode, _ = container_dict[row_data["Source Container Barcode"]]
            if container.kind == TUBE:
                return parent_barcode
            else:
                return container.barcode

        def get_source_container_coord(row_data, container_dict) -> str:
            container, _, _ = container_dict[row_data["Source Container Barcode"]]
            if container.kind == TUBE:
                return container.coordinates
            else:
                return row_data["Source Container Coord"]

        def get_source_container_spec(row_data, container_dict) -> str:
            container, _, parent_kind = container_dict[row_data["Source Container Barcode"]]
            if container.kind == TUBE:
                return CONTAINER_KIND_SPECS[parent_kind].coordinate_spec
            else:
                return CONTAINER_KIND_SPECS[container.kind].coordinate_spec

        def convert_to_numerical_robot_coord(coord_spec, fms_coord) -> int:
            first_axis_len = len(coord_spec[FIRST_COORD_AXIS])
            second_axis_coord = int(fms_coord[1:])
            return (ord(fms_coord[:1]) - 64) + (first_axis_len * (second_axis_coord - 1)) # ord A is 65 we need to shift -64 to recenter it

        mapping_dest_containers = {}
        mapping_src_containers = {}
        coord_spec_by_barcode = {}
        output_rows_data = rows_data[:]
        robot_files = []

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        ################################################################################################

        
        for output_row_data in output_rows_data:
            if output_row_data["Destination Container Kind"] is None:
                # Ensure the Destination Container Kind is in the template even in the case where the user reuse an existing container
                output_row_data["Destination Container Kind"] = Container.objects.get(barcode=output_row_data["Destination Container Barcode"]).kind

        dup_containers = zip([output_row_data["Destination Container Barcode"] for output_row_data in output_rows_data],
                             [output_row_data["Destination Container Kind"] for output_row_data in output_rows_data])

        dest_containers = unique(dup_containers)

        # Map container spec to destination container barcode
        for barcode, kind in dest_containers:
            if kind == TUBE:
                return robot_files, output_rows_data # Tube output unexpected return no robot files.
            coord_spec_by_barcode[barcode] = CONTAINER_KIND_SPECS[kind].coordinate_spec # kind should not be tube

        # Map destination container barcode to robot destination barcodes
        for i, (barcode, _) in enumerate(dest_containers, start=1):
            mapping_dest_containers[barcode] = ROBOT_DST_PREFIX + str(i)

        for output_row_data in output_rows_data:
            # Add robot barcode to the rows_data
            output_row_data["Robot Destination Container"] = mapping_dest_containers[output_row_data["Destination Container Barcode"]]
            # Add robot dest coord to the rows_data
            output_row_data["Robot Destination Coord"] = convert_to_numerical_robot_coord(coord_spec_by_barcode[output_row_data["Destination Container Barcode"]],
                                                                                          output_row_data["Destination Container Coord"])

        # Sort incomming list using the destination plates barcodes and coords
        output_rows_data.sort(key=lambda x: (get_robot_destination_container(x), get_robot_destination_coord(x)), reverse=False)

        container_dict = build_source_container_dict(output_rows_data)
        
        src_containers = unique(get_source_container_barcode(output_row_data, container_dict) for output_row_data in output_rows_data)

        # Map source container barcode to robot source barcodes
        for i, barcode in enumerate(src_containers, start=1):
            mapping_src_containers[barcode] = ROBOT_SRC_PREFIX + str(i)

        for output_row_data in output_rows_data:
            # Add robot barcode to the rows_data
            output_row_data["Robot Source Container"] = mapping_src_containers[get_source_container_barcode(output_row_data, container_dict)]
            # Add robot src coord to the sorted rows_data
            output_row_data["Robot Source Coord"] = convert_to_numerical_robot_coord(get_source_container_spec(output_row_data, container_dict),
                                                                                     get_source_container_coord(output_row_data, container_dict))

        if norm_choice == LIBRARY_CHOICE:
            # Creating the 2 robot files
            add_diluent_io = BytesIO()
            add_library_io = BytesIO()
            add_diluent_lines = []
            add_library_lines = []
            add_diluent_lines.append((",".join(["DstNameForDiluent", "DstWellForDiluent", "DiluentVol"]) + "\n").encode())
            add_library_lines.append((",".join(["SrcBarcode", "SrcName", "SrcWell", "DstName", "DstWell", "DNAVol"]) + "\n").encode())

            for output_row_data in output_rows_data:
                container_src_barcode = output_row_data["Source Container Barcode"]
                robot_src_barcode = output_row_data["Robot Source Container"]
                robot_dst_barcode = output_row_data["Robot Destination Container"]
                robot_src_coord = output_row_data["Robot Source Coord"]
                robot_dst_coord = output_row_data["Robot Destination Coord"]
                volume_library = decimal.Decimal(output_row_data["Volume Used (uL)"])
                volume_diluent = decimal.Decimal(output_row_data["Volume (uL)"]) - volume_library

                add_diluent_lines.append((",".join([robot_dst_barcode,
                                                    str(robot_dst_coord),
                                                    str(volume_diluent)]) + "\n").encode())
                add_library_lines.append((",".join([container_src_barcode,
                                                    robot_src_barcode,
                                                    str(robot_src_coord),
                                                    robot_dst_barcode,
                                                    str(robot_dst_coord),
                                                    str(volume_library)]) + "\n").encode())

            add_diluent_io.writelines(add_diluent_lines)
            add_library_io.writelines(add_library_lines)
            robot_files = [
                {"name": f"Normalization_libraries_diluent_{timestamp}.csv",
                  "content": add_diluent_io.getvalue(),},
                {"name": f"Normalization_libraries_main_dilution_{timestamp}.csv",
                 "content": add_library_io.getvalue(),},
            ]

        elif norm_choice == SAMPLE_CHOICE:
            # Create the single robot file
            normalization_io = BytesIO()
            normalization_lines = []
            normalization_lines.append((",".join(["Src ID", "Src Coord", "Dst ID", "Dst Coord", "Diluent Vol", "Sample Vol"]) + "\n").encode())

            for output_row_data in output_rows_data:
                robot_src_barcode = output_row_data["Robot Source Container"]
                robot_dst_barcode = output_row_data["Robot Destination Container"]
                robot_src_coord = output_row_data["Robot Source Coord"]
                robot_dst_coord = output_row_data["Robot Destination Coord"]
                volume_sample = decimal.Decimal(output_row_data["Volume Used (uL)"])
                volume_diluent = decimal.Decimal(output_row_data["Volume (uL)"]) - volume_sample

                normalization_lines.append((",".join([robot_src_barcode,
                                                      str(robot_src_coord),
                                                      robot_dst_barcode,
                                                      str(robot_dst_coord),
                                                      str(volume_diluent),
                                                      str(volume_sample)]) + "\n").encode()) # Encode to store a bytes-like object

            normalization_io.writelines(normalization_lines)
            robot_files = [
                {"name": f"Normalization_samples_{timestamp}.csv",
                 "content": normalization_io.getvalue(),},
            ]

        return robot_files, output_rows_data
