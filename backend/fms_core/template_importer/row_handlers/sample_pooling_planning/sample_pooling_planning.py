from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.services.container import get_container, is_container_valid_destination
from fms_core.services.sample import get_sample_from_container
from fms_core.utils import decimal_rounded_to_precision

import decimal

class SamplePoolingPlanningRowHandler(GenericRowHandler):
    """
         Extracts the information of each row in a template sheet and validates it.

         Returns:
             The errors and warnings of the row in question after validation.
    """

    def process_row_inner(self, type, source_sample, pool, measurements):
        
        source_sample_obj, self.errors["sample"], self.warnings["sample"] = get_sample_from_container(
            barcode=source_sample["container"]["barcode"],
            coordinates=source_sample['coordinates'])

        if source_sample_obj and source_sample_obj.concentration is None:
            self.errors['concentration'] = f'A library needs a known concentration to be pooled. QC library {source_sample_obj.name} first.'

        if source_sample_obj is not None and not self.has_errors():
            # Add a warning if the sample has failed qc
            if any([source_sample_obj.quality_flag is False, source_sample_obj.quantity_flag is False]):
                self.warnings["qc_flags"] = ("Source sample {0} has failed QC.", [source_sample_obj.name])
                
            # ensure that the sample source is a library
            if not source_sample_obj.is_library:
                self.errors["sample"] = ("Attempting to pool source sample {0} which is not a library.", [source_sample_obj.name])

            # ensure that if the sample source is in a tube, the tube has a parent container in FMS.
            container_obj, self.errors["src_container"], self.warnings["src_container"] = get_container(barcode=source_sample["container"]["barcode"])
            if not source_sample_obj.coordinates and container_obj.location is None: # sample without coordinate => tube
                self.errors["robot_input_coordinates"] = "Source samples in tubes must be in a rack for coordinates to be generated for robot."

            if measurements["na_quantity"] is None:
                self.errors["na_quantity"] = "A nucleic acid quantity is required to pool sample."
            else:
                #compute volume used
                input_requested = decimal.Decimal(measurements["na_quantity"])
                input_available = source_sample_obj.volume * source_sample_obj.concentration
                # use volume for requested input else use all the source volume
                if input_available >= input_requested:
                    volume_used = decimal_rounded_to_precision(input_requested / source_sample_obj.concentration)
                else:
                    volume_used = source_sample_obj.volume
                    self.warnings["na_quantity"] = ("Source sample {0} has insufficient available material. Adjusting requested input to {1} ng ({2} uL used).", [source_sample_obj.name, input_available, volume_used])

            # Ensure the destination container exist or has enough information to be created.
            destination_container_dict = pool["container"]
            # destination container is not placed in a parent container
            container_parent_obj = None

            _, self.errors["dest_container"], self.warnings["dest_container"] = is_container_valid_destination(destination_container_dict["barcode"],
                                                                                                               pool["coordinates"],
                                                                                                               destination_container_dict["kind"],
                                                                                                               destination_container_dict["name"],
                                                                                                               destination_container_dict["coordinates"],
                                                                                                               container_parent_obj)

            if not self.has_errors():
                self.row_object = {
                    "Pool Name": pool["name"],
                    "Type": type,
                    "Source Sample": source_sample_obj,
                    "Source Sample Name": source_sample["name"],
                    "Source Container Barcode": source_sample["container"]["barcode"],
                    "Source Container Coord": source_sample["coordinates"],
                    "Robot Source Container": "",
                    "Robot Source Coord": "",
                    "Source Depleted": source_sample["depleted"],
                    "Current Volume (uL)": source_sample_obj.volume,
                    "Volume Used (uL)": str(volume_used),
                    "Volume In Pool (uL)": str(volume_used), # no dilution expected, all solvent removed after pooling
                    "Destination Container Barcode": destination_container_dict["barcode"],
                }