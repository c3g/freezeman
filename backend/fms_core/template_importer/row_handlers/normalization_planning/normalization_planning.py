from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.template_importer._constants import VALID_ROBOT_CHOICES, GENOTYPING_TYPE, LIBRARY_TYPE, SAMPLE_TYPE
from fms_core.services.container import get_container, is_container_valid_destination
from fms_core.services.sample import get_sample_from_container
from fms_core.services.library import convert_library_concentration_from_nm_to_ngbyul, convert_library_concentration_from_ngbyul_to_nm

from fms_core.utils import decimal_rounded_to_precision

import decimal

class NormalizationPlanningRowHandler(GenericRowHandler):
    """
         Extracts the information of each row in a template sheet and validates it.

         Returns:
             The errors and warnings of the row in question after validation.
    """

    def process_row_inner(self, type, source_sample, destination_sample, measurements, robot):
        concentration_nguL = None
        concentration_nm = None
        combined_concentration_nguL = None

        # Check if robot output choice is valid
        if type == LIBRARY_TYPE and robot is not None:
            self.warnings['robot'] = ("Library type normalization offers a single robot output format. Robot selection {0} ignored.", [robot])
        if (type == GENOTYPING_TYPE or type == SAMPLE_TYPE) and robot not in VALID_ROBOT_CHOICES:
            self.errors['robot'] = f"Normalization type {type} requires a robot selection among the following choices : {VALID_ROBOT_CHOICES}."

        # Check case when none of the options were provided
        if all([measurements['concentration_nm'] is None,
                measurements['concentration_ngul'] is None,
                measurements['na_quantity'] is None]):
            self.errors['concentration'] = 'One option (A, B or C) should be specified.'

        # Check that there's only one option provided
        elif sum([measurements['concentration_nm'] is not None, measurements['concentration_ngul'] is not None, measurements['na_quantity'] is not None]) != 1:
            self.errors['concentration'] = 'Only one option must be specified out of the following: NA quantity, conc. ng/uL or conc. nM.'

        source_sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=source_sample['container']['barcode'],
            coordinates=source_sample['coordinates'])

        if source_sample_obj and source_sample_obj.concentration is None:
            self.errors['concentration'] = f'A sample or library needs a known concentration to be normalized. QC sample {source_sample_obj.name} first.'

        if source_sample_obj is not None and not self.has_errors():
            # Add a warning if the sample has failed qc
            if any([source_sample_obj.quality_flag is False, source_sample_obj.quantity_flag is False]):
                self.warnings["qc_flags"] = ("Source sample {0} has failed QC.", [source_sample_obj.name])
                
            # ensure that the sample source is a library if the norm choice is library
            # If it is a pool we have to check if it is a pool of libraries
            if type == LIBRARY_TYPE and not source_sample_obj.is_library:
                self.errors['sample'] = f'The normalization type choice was library. However, the source sample is not a library or a pool of libraries.'

            # ensure that if the sample source is in a tube, the tube has a parent container in FMS.
            container_obj, self.errors['src_container'], self.warnings['src_container'] = get_container(barcode=source_sample['container']['barcode'])
            if not source_sample_obj.coordinates and container_obj.location is None: # sample without coordinate => tube
                self.errors['robot_input_coordinates'] = 'Source samples in tubes must be in a rack for coordinates to be generated for robot.'

            input_available = source_sample_obj.volume * source_sample_obj.concentration

            if measurements['concentration_ngul'] is not None:
                concentration_nguL = measurements['concentration_ngul']
                input_requested = decimal.Decimal(measurements['volume']) * decimal.Decimal(concentration_nguL)
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
                        self.errors['concentration'] = 'Concentration could not be converted from nM to ng/uL.'
                input_requested = decimal.Decimal(measurements['volume']) * combined_concentration_nguL
            elif measurements['na_quantity'] is not None:
                #compute concentration in ngul
                concentration_nguL = decimal.Decimal(measurements['na_quantity']) / decimal.Decimal(measurements['volume'])
                input_requested = decimal.Decimal(measurements['na_quantity'])
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
           
            # Rule of thumb for Normalization (with bypass):
            # When making the planning for the normalization, the requested input is the product of requested concentration and final volume.
            # We compare this value with the available input (source sample concentration * volume).
            # If the source concentration is too low we put as much from the source sample to reach final volume if not enough material is available
            # buffer is used to ensure that the final volume is reached.
            # If requested input is greater than available input, we put all source volume and add the difference in volume as buffer.
           
            adjusted_concentration = source_sample_obj.concentration
            # is concentration insufficient ?
            if combined_concentration_nguL > source_sample_obj.concentration:
                volume_used = min(source_sample_obj.volume, decimal.Decimal(measurements['volume']))
                adjusted_concentration = (volume_used / decimal.Decimal(measurements['volume'])) * adjusted_concentration
                if measurements['bypass_input_requirement']:
                    self.warnings['concentration'] = ('Insufficient concentration to comply. Bypassing input requirement by adjusting requested concentration to {0} ng/uL.', [adjusted_concentration])
                else:
                    self.errors['concentration'] = 'Requested concentration is higher than the source sample concentration. This cannot be achieved by dilution. Use bypass if you want to submit using this final volume value.'
            # is source sample available input sufficient ?
            elif input_requested > input_available:
                volume_used = source_sample_obj.volume
                adjusted_concentration = (volume_used / decimal.Decimal(measurements['volume'])) * adjusted_concentration
                if measurements['bypass_input_requirement']:
                    self.warnings['concentration'] = ('Insufficient available NA material to comply. Bypassing input requirement by adjusting requested concentration to {0} ng/uL.', [adjusted_concentration])
                else:
                    self.errors['concentration'] = 'Insufficient available NA material to comply. Use bypass if you want to submit using this final volume value.'
            # Input sufficient
            else:
                volume_used = input_requested / source_sample_obj.concentration # calculate the volume of source sample to use.
                adjusted_concentration = combined_concentration_nguL

            # final volume adjustment for Manual Dilutant
            if measurements['manual_diluent_volume']:
                volume_diluent = (decimal.Decimal(measurements['volume']) - volume_used) - decimal.Decimal(measurements['manual_diluent_volume'])
                if volume_diluent < 0:
                    volume_used = volume_used + volume_diluent
                    adjusted_concentration = (volume_used / decimal.Decimal(measurements['volume'])) * adjusted_concentration
                    if measurements['bypass_input_requirement']:
                        self.warnings['manual_diluent'] = ('Insufficient concentration to add {0} uL of diluent. Bypassing input requirement by adjusting requested concentration to {1} ng/uL.', [measurements['manual_diluent_volume'], adjusted_concentration])
                    else:
                        self.errors['manual_diluent'] = 'Volume of manual diluent required to comply cannot be supplied given the sample concentration. Use bypass if you want to submit and reduce the requested concentration.'
            else:
                volume_diluent = decimal.Decimal(measurements['volume']) - volume_used

            volume_used = decimal_rounded_to_precision(volume_used)
            volume_diluent = decimal_rounded_to_precision(volume_diluent)
            final_volume = decimal_rounded_to_precision(decimal.Decimal(measurements['volume']))

            if concentration_nm is not None:
                adjusted_concentration_nm, errors_conversion, warnings_conversion = convert_library_concentration_from_ngbyul_to_nm(source_sample_obj, adjusted_concentration)
                self.errors['concentration_conversion'].extend(errors_conversion)
                self.warnings['concentration_conversion'].extend(warnings_conversion)

            if not self.has_errors():
                self.row_object = {
                    'Type': type,
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
                    'Initial Conc. (ng/uL)': source_sample_obj.concentration,
                    'Current Volume (uL)': source_sample_obj.volume,
                    'Volume Used (uL)': str(volume_used),
                    'Volume Diluent (uL)': str(max(volume_diluent, 0)), # We want the volume of diluent to insert in the robot csv
                    'Volume (uL)': str(final_volume),
                    'Conc. (ng/uL)': str(adjusted_concentration) if concentration_nguL is not None else '',
                    'Conc. (nM)': str(adjusted_concentration_nm) if concentration_nm is not None else '',
                    'Normalization Date (YYYY-MM-DD)': '',
                    'Comment': '',
                }
