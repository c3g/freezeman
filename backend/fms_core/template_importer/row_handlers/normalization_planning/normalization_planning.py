from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.template_importer._constants import VALID_NORM_CHOICES, LIBRARY_CHOICE

from fms_core.services.container import get_container, is_container_valid_destination
from fms_core.services.sample import get_sample_from_container
from fms_core.services.library import convert_library_concentration_from_nm_to_ngbyul

from fms_core.utils import decimal_rounded_to_precision

import decimal

class NormalizationPlanningRowHandler(GenericRowHandler):
    """
         Extracts the information of each row in a template sheet and validates it.

         Returns:
             The errors and warnings of the row in question after validation.
    """

    def process_row_inner(self, source_sample, destination_sample, measurements, robot, pool):
        concentration_nguL = None
        concentration_nm = None
        combined_concentration_nguL = None

        # Check if robot output choice is valid
        if robot["norm_choice"] not in VALID_NORM_CHOICES:
            self.errors['robot_norm_choice'] = f"Robot normalization choice must be chosen among the following choices : {VALID_NORM_CHOICES}."

        # Check case when none of the options were provided
        if all([measurements['concentration_nm'] is None,
                measurements['concentration_ngul'] is None,
                measurements['na_quantity'] is None]):
            self.errors['concentration'] = 'One option (A, B or C) should be specified.'

        # Check that there's only one option provided
        elif sum([measurements['concentration_nm'] is not None,
                measurements['concentration_ngul'] is not None,
                measurements['na_quantity'] is not None]) != 1:
            self.errors['concentration'] = 'Only one option must be specified out of the following: NA quantity, conc. ng/uL or conc. nM.'

        source_sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=source_sample['container']['barcode'],
            coordinates=source_sample['coordinates'])

        if source_sample_obj is not None and "concentration" not in self.errors.keys():
            if source_sample_obj.concentration is None:
                self.errors['concentration'] = f'A sample or library needs a known concentration to be normalized. QC sample {source_sample_obj.name} first.'

            # ensure that the sample source is a library if the norm choice is library
            # If it is a pool we have to check if it is a pool of libraries
            if robot['norm_choice'] == LIBRARY_CHOICE and not source_sample_obj.is_library:
                self.errors['sample'] = f'The robot normalization choice was library. However, the source sample is not a library or a pool of libraries.'

            # ensure that if the sample source is in a tube, the tube has a parent container in FMS.
            container_obj, self.errors['src_container'], self.warnings['src_container'] = get_container(barcode=source_sample['container']['barcode'])
            if not source_sample_obj.coordinates and container_obj.location is None: # sample without coordinate => tube
                self.errors['robot_input_coordinates'] = 'Source samples in tubes must be in a rack for coordinates to be generated for robot.'

            if measurements['concentration_ngul'] is not None:
                concentration_nguL = measurements['concentration_ngul']
                na_qty = decimal.Decimal(measurements['volume']) * decimal.Decimal(concentration_nguL)
                combined_concentration_nguL = concentration_nguL
            elif measurements['concentration_nm'] is not None:
                if not source_sample_obj.is_library:
                    self.errors['concentration'] = 'Concentration in nM cannot be used to normalize samples that are not libraries or pool of libraries.'
                else:
                    concentration_nm = measurements['concentration_nm']
                    # Calculate the concentration taking into account volume ratios
                    combined_concentration_nguL, self.errors['concentration_conversion'], self.warnings['concentration_conversion'] = \
                        convert_library_concentration_from_nm_to_ngbyul(source_sample_obj, concentration_nm)
                    combined_concentration_nguL = decimal.Decimal(combined_concentration_nguL)
                    if combined_concentration_nguL is None:
                        self.errors['concentration'] = 'Concentration could not be converted from nM to ng/uL'
                na_qty = decimal.Decimal(measurements['volume']) * combined_concentration_nguL
            elif measurements['na_quantity'] is not None:
                #compute concentration in ngul
                concentration_nguL = decimal.Decimal(measurements['na_quantity']) / decimal.Decimal(measurements['volume'])
                na_qty = decimal.Decimal(measurements['na_quantity'])
                combined_concentration_nguL = concentration_nguL

            # Ensure the destination container exist or has enough information to be created.
            destination_container_dict = destination_sample['container']
            parent_barcode = destination_container_dict['parent_barcode']

            if parent_barcode:
                container_parent_obj, self.errors['parent_container'], self.warnings['parent_container'] = get_container(
                    barcode=parent_barcode)
            else:
                container_parent_obj = None

            _, self.errors['dest_container'], self.warnings['dest_container'] = is_container_valid_destination(destination_container_dict['barcode'],
                                                                                                               destination_sample['coordinates'],
                                                                                                               destination_container_dict['kind'],
                                                                                                               destination_container_dict['name'],
                                                                                                               destination_container_dict['coordinates'],
                                                                                                               container_parent_obj)

            volume_used = na_qty / source_sample_obj.concentration # calculate the volume of source sample to use.

            if combined_concentration_nguL > source_sample_obj.concentration:
                self.errors['concentration'] = 'Requested concentration is higher than the source sample concentration. This cannot be achieved by dilution.'

            if volume_used > source_sample_obj.volume:
                adjusted_volume = decimal_rounded_to_precision(source_sample_obj.volume * source_sample_obj.concentration / combined_concentration_nguL)
                volume_used = source_sample_obj.volume
                self.warnings['volume'] = f'Insufficient source sample volume to comply. ' \
                                          f'Requested Final volume ({measurements["volume"]} uL) ' \
                                          f'will be adjusted to {adjusted_volume} uL to ' \
                                          f'maintain requested concentration while using all source sample volume.'
            else:
                adjusted_volume = measurements['volume']

            volume_used = decimal_rounded_to_precision(volume_used)
            adjusted_volume = decimal_rounded_to_precision(adjusted_volume)

            adjusted_pooled_volume = None
            if bool(pool["pool_name"]) != bool(pool["volume_pooled"]):
                self.errors["pool"].append(f"Incomplete information provided for pooling libraries after normalization.")

            if pool["pool_name"] is not None and pool["volume_pooled"] is not None:
                if pool["pool_name"] not in pool["pool_list"]:
                    self.errors["pool"].append(f"Pool {pool['pool_name']} is not listed in the pools sheet.")
                if not source_sample_obj.is_library:
                    self.errors["pool"].append(f"Only libraries can be pooled after normalization.")

                # ensure the volume for pooling does not surpass the volume after normalization
                if pool["volume_pooled"] and pool["volume_pooled"] > adjusted_volume:
                    adjusted_pooled_volume = adjusted_volume
                    self.warnings['volume_pooled'] = f'Insufficient normalized sample volume to comply. ' \
                                                     f'Requested pooled volume ({pool["volume_pooled"]} uL) ' \
                                                     f'will be adjusted to {adjusted_pooled_volume} uL to ' \
                                                     f'complete the pooling operation successfully.'
                else:
                    adjusted_pooled_volume = pool["volume_pooled"]

            if not self.has_errors():
                self.row_object = {
                    'Source Sample': source_sample_obj,
                    'Sample Name': source_sample['name'],
                    'Source Container Barcode': source_sample['container']['barcode'],
                    'Source Container Coord': source_sample['coordinates'],
                    'Robot Source Container': '',
                    'Robot Source Coord': '',
                    'Destination Container Barcode': destination_container_dict['barcode'],
                    'Destination Container Coord': destination_sample['coordinates'],
                    'Robot Destination Container': '',
                    'Robot Destination Coord': '',
                    'Destination Container Name': destination_container_dict['name'],
                    'Destination Container Kind': destination_container_dict['kind'],
                    'Destination Parent Container Barcode': destination_container_dict['parent_barcode'],
                    'Destination Parent Container Coord': destination_container_dict['coordinates'],
                    'Source Depleted': '',
                    'Volume Used (uL)': str(volume_used),
                    'Volume (uL)': str(adjusted_volume),
                    'Conc. (ng/uL)': str(concentration_nguL) if concentration_nguL is not None else '',
                    'Conc. (nM)': str(concentration_nm) if concentration_nm is not None else '',
                    'Normalization Date (YYYY-MM-DD)': '',
                    'Pool Name': pool['pool_name'] if pool['pool_name'] is not None else '',
                    'Pooled Volume (uL)': str(adjusted_pooled_volume) if adjusted_pooled_volume is not None else '',
                    'Comment': '',
                }
