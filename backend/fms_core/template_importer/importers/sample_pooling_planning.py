from fms_core.template_prefiller.prefiller import PrefillTemplateFromDict
from fms_core.template_importer.row_handlers.sample_pooling_planning import SamplePoolingPlanningRowHandler
from fms_core.templates import SAMPLE_POOLING_PLANNING_TEMPLATE, SAMPLE_POOLING_TEMPLATE

from fms_core.models import Container
from ...containers import CONTAINER_KIND_SPECS
from fms_core.services.id_generator import get_unique_id

from ._generic import GenericImporter
from .._utils import float_to_decimal_and_none, zip_files
from fms_core.utils import str_cast_and_normalize, unique, check_truth_like

from io import BytesIO
from datetime import datetime
import decimal
from collections import namedtuple

class SamplePoolingPlanningImporter(GenericImporter):
    """
         Template importer for the Pooling Protocol.

         Args:
             `sheet`: The template to ingest.

         Returns:
             A detailed validation of the data trying to be ingested as a result.
    """

    SHEETS_INFO = SAMPLE_POOLING_PLANNING_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        pass

    def import_template_inner(self):
        sheet = self.sheets["SamplesToPool"]
        sheet_df = sheet.dataframe

        MAX_SOURCE_CONTAINERS = 8
        MAX_DESTINATION_CONTAINERS = 24
        TUBE = "tube"

        source_containers_barcodes = set()
        destination_containers_barcodes = set()

        pooling_mapping_rows = []
        container_unique_id = get_unique_id()
        base_error_rows = []
        # For each row initialize the object that is going to be prefilled in the pooling template
        for row_id, row_data in enumerate(sheet.rows):
            pooling_type = str_cast_and_normalize(row_data["Type"])
            source_sample = {
                "name": str_cast_and_normalize(row_data["Source Sample Name"]),
                "container": {"barcode": str_cast_and_normalize(row_data["Source Container Barcode"])},
                "coordinates": str_cast_and_normalize(row_data["Source Container Coord"]),
                "depleted": check_truth_like(row_data["Source Depleted"]) if row_data["Source Depleted"] else None,
            }

            pool_name = str_cast_and_normalize(row_data["Pool Name"])

            pool = {
                "name": pool_name,
                "coordinates": None, # No coordinate in tube
                "container": {
                    "barcode": pool_name + "_" + str(container_unique_id), # Artificial barcode built from the pool name and a sequential number
                    "name": pool_name + "_" + str(container_unique_id), # Same as barcode
                    "kind": TUBE, # tube
                    "coordinates": None, # Do not place into a parent
                    "parent_barcode": None, # Do not place into a parent
                },
            }

            measurements = {
                'na_quantity': float_to_decimal_and_none(row_data['NA Quantity Used (ng)']),
            }

            source_containers_barcodes.add(source_sample["container"]["barcode"])
            destination_containers_barcodes.add(pool["container"]["barcode"])

            pooling_kwargs = dict(
                type=pooling_type,
                source_sample=source_sample,
                pool=pool,
                measurements=measurements,
            )

            (result, pooling_row_mapping) = self.handle_row(
                row_handler_class=SamplePoolingPlanningRowHandler,
                sheet=sheet,
                row_i=row_id,
                **pooling_kwargs
            )

            if (pooling_row_mapping is None):
                base_error_rows.append(sheet.rows_results[row_id]["row_repr"])
            
            pooling_mapping_rows.append(pooling_row_mapping)

        if (len(source_containers_barcodes) > MAX_SOURCE_CONTAINERS):
            self.base_errors.append(f"Too many source containers ({MAX_SOURCE_CONTAINERS}) for the robot.")
        if (len(destination_containers_barcodes) > MAX_DESTINATION_CONTAINERS):
            self.base_errors.append(f"Too many pools ({MAX_DESTINATION_CONTAINERS}) for the robot.")

        if len(base_error_rows) > 1:
            self.base_errors.append(f"Rows {base_error_rows} have errors.")
        elif len(base_error_rows) == 1:
            self.base_errors.append(f"Row {base_error_rows[0]} has errors.")

        if not self.dry_run and not self.base_errors:
            # Create robot file and create the dictionary to populate both pooling template sheets.
            robot_files, updated_pooling_mapping_rows, pool_mapping_rows = self.prepare_robot_file(pooling_mapping_rows, pooling_type)

            # Prepare the pooling template, the dict for each sheet need to be in the order listed in the template sheet definition
            pooling_prefilled_template = PrefillTemplateFromDict(SAMPLE_POOLING_TEMPLATE, [pool_mapping_rows, updated_pooling_mapping_rows])
            pooling_prefilled_template_name = "/".join(SAMPLE_POOLING_TEMPLATE["identity"]["file"].split("/")[-1:])
            files_to_zip = [{'name': pooling_prefilled_template_name,
                             'content': pooling_prefilled_template,}]

            files_to_zip.extend(robot_files)
            output_zip_name = f"Sample_pooling_planning_output_{datetime.today().strftime('%Y-%m-%d')}_{str(get_unique_id())}"

            # Zip files
            zip_buffer = zip_files(output_zip_name, files_to_zip)

            self.output_file = {
                'name': output_zip_name + '.zip',
                'content': zip_buffer.getvalue()
            }
            
    def prepare_robot_file(self, pooling_rows_data, pooling_type):
        """
        This function takes the content of the pooling planning template as input to create
        a csv file that contains the required configuration for the robot execution of the
        pooling in the lab.

        Args:
            norm_rows_data: A list of row_data for the pooling extracted by the importer and already validated by the row_handler.
            pooling_type: The choice between "Experiment Run", "Capture MCC" and "Capture Exome" type of pooling. Experiment Run
                          pooling should not use the planning template.
            
        Returns:
            A tuple containing : a list of dict that contains robot csv files and an updated version of the sample row_data 
                                 (sorted and completed) and pool row_data.
        """
        FIRST_COORD_AXIS = 0
        DILUENT_VOLUME = "0"  # This is an hardcoded value since no diluent volume is added to the pool
        
        ROBOT_SRC_PREFIX = "Src"
        ROBOT_DST_PREFIX = "TubeDst"

        container_data = namedtuple("container_data", ["pool_name", "barcode"])

        def build_source_container_dict(src_containers: type[container_data]):
            container_dict = {}
            for i, src_container in enumerate(src_containers, start=1):
                container = Container.objects.get(barcode=src_container["barcode"])
                container_dict[container.barcode] = (container, ROBOT_SRC_PREFIX + str(i))
            return container_dict

        def get_source_container_barcode(row_data, container_dict) -> str:
            _, robot_barcode = container_dict[row_data["Source Container Barcode"]]
            return robot_barcode

        def get_source_container_spec(row_data, container_dict) -> str:
            container, _ = container_dict[row_data["Source Container Barcode"]]
            return CONTAINER_KIND_SPECS[container.kind].coordinate_spec

        def convert_to_numerical_robot_coord(coord_spec, fms_coord) -> int:
            first_axis_len = len(coord_spec[FIRST_COORD_AXIS])
            second_axis_coord = int(fms_coord[1:])
            return (ord(fms_coord[:1]) - 64) + (first_axis_len * (second_axis_coord - 1)) # ord A is 65 we need to shift -64 to recenter it

        output_sample_rows_data = pooling_rows_data[:]
        output_pool_rows_data = {}
        robot_files = []

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        ##################### Ordering and setup of the normalization data ###########################
        

        dst_containers = unique(container_data(sample_row_data["Pool Name"], sample_row_data["Destination Container Barcode"]) for sample_row_data in output_sample_rows_data)

        # Map destination container barcode to robot destination coordinates
        for i, dst_container in enumerate(dst_containers, start=1):
            output_pool_rows_data[dst_containers["pool_name"]] = {"Pool Name": dst_container["pool_name"],
                                                                  "Destination Container Barcode": dst_container["barcode"],
                                                                  "Robot Destination Container": ROBOT_DST_PREFIX + str(i),
                                                                  "Robot Destination Coord": i}

        src_containers = unique(container_data(sample_row_data["Pool Name"], sample_row_data["Source Container Barcode"]) for sample_row_data in output_sample_rows_data)
        container_dict = build_source_container_dict(src_containers)

        for output_row_data in output_sample_rows_data:
            output_row_data["Robot Source Container"] = get_source_container_barcode(output_row_data, container_dict)
            output_row_data["Robot Source Coord"] = convert_to_numerical_robot_coord(get_source_container_spec(output_row_data, container_dict),
                                                                                     output_row_data["Source Container Coord"])
            output_row_data["Robot Destination Container"] = output_pool_rows_data[output_row_data["Pool Name"]]["Robot Destination Container"]
            output_row_data["Robot Destination Coord"] = output_pool_rows_data[output_row_data["Pool Name"]]["Robot Destination Coord"]

        # Sort incomming list using the destination tube coord and source barcode and coord
        output_sample_rows_data.sort(key=lambda x: (x["Robot Destination Coord"], x["Robot Source Container"], x["Robot Source Coord"]), reverse=False)

        # Create the single robot file
        pooling_io = BytesIO()
        pooling_lines = []
        pooling_lines.append((",".join(["Src ID", "Src Coord", "Dst ID", "Dst Coord", "Diluent Vol", "Sample Vol"]) + "\n").encode())

        for output_row_data in output_sample_rows_data:
                robot_src_barcode = output_row_data["Robot Source Container"]
                robot_dst_barcode = output_row_data["Robot Destination Container"]
                robot_src_coord = output_row_data["Robot Source Coord"]
                robot_dst_coord = output_row_data["Robot Destination Coord"]
                volume_sample = decimal.Decimal(output_row_data["Volume Used (uL)"])
                volume_diluent = DILUENT_VOLUME

                pooling_lines.append((",".join([robot_src_barcode,
                                                str(robot_src_coord),
                                                robot_dst_barcode,
                                                str(robot_dst_coord),
                                                str(volume_diluent),
                                                str(volume_sample)]) + "\n").encode()) # Encode to store a bytes-like object

        pooling_io.writelines(pooling_lines)
        robot_files = [
            {"name": f"Pooling_{pooling_type.lower()}_Janus_{timestamp}.csv",
             "content": pooling_io.getvalue(),},
        ]

        return robot_files, output_sample_rows_data, output_pool_rows_data
