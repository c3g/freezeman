from fms_core.template_importer.row_handlers._generic import GenericRowHandler
from fms_core.template_importer.importers.normalization_planning import VALID_NORM_CHOICES, VALID_ROBOT_FORMATS

from fms_core.models import ProcessMeasurement

from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.sample import get_sample_from_container, transfer_sample, update_sample, validate_normalization
from fms_core.services.property_value import create_process_measurement_properties

from fms_core.utils import convert_concentration_from_nm_to_ngbyul


class NormalizationPlanningRowHandler(GenericRowHandler):
    """
         Extracts the information of each row in a template sheet and validates it.

         Returns:
             The errors and warnings of the row in question after validation.
    """

    def process_row_inner(self, source_sample, destination_sample, measurements, robot):
        concentration_nguL = None
        concentration_nM = None

        # Check if robot options are valid
        if robot["norm_choice"] not in VALID_NORM_CHOICES:
            self.errors['robot_norm_choice'] = f"Robot norm choice must be chosen among the following choices : {VALID_NORM_CHOICES}."
        if robot["output_format"] not in VALID_ROBOT_FORMATS:
            self.errors['robot_output_format'] = f"Robot output format must be chosen among the following choices : {VALID_ROBOT_FORMATS}."

        # Check case when none of the options were provided
        if all([measurements['concentration_nm'] is None, measurements['concentration_ngul'] is None,
                measurements['na_quantity'] is None]):
            self.errors['concentration'] = 'One option (A, B or C) should be specified.'

        # Check that there's only one option provided
        if sum([measurements['concentration_nm'] is not None, measurements['concentration_ngul'] is not None,
                measurements['na_quantity'] is not None]) != 1:
            self.errors['concentration'] = 'Only one option must be specified out  of the following: NA quantity, conc. ng/uL or conc. nM'

        if measurements['concentration_ngul']:
            concentration_nguL = measurements['concentration_ngul']
        elif measurements['concentration_nM']:
            concentration_nM = measurements['concentration_nM']
        elif measurements['na_quantity']:
            #compute concentration in ngul
            concentration_nguL = measurements['na_quantity'] / measurements['Final Volume']

        source_sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=source_sample['container']['barcode'],
            coordinates=source_sample['coordinates'])

        destination_container_dict = destination_sample['container']

        parent_barcode = destination_container_dict['parent_barcode']
        if parent_barcode:
            container_parent_obj, self.errors['parent_container'], self.warnings['parent_container'] = get_container(
                barcode=parent_barcode)
        else:
            container_parent_obj = None

        if source_sample_obj and (container_parent_obj or not parent_barcode) and "concentration" not in self.errors.keys():
            self.row_object = {
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
                'Destination Parent Container Barcode': destination_container_dict['barcode'],
                'Destination Parent Container Coord': destination_container_dict['coordinates'],
                'Source Depleted': '',
                'Volume Used (uL)': '',
                'Volume (uL)': measurements['volume'],
                'Conc. (ng/uL)': measurements['concentration_ngul'] if concentration_nguL else '',
                'Conc. (nM)': measurements['concentration_nM'] if concentration_nM else '',
                'Normalization Date (YYYY-MM-DD)': '',
                'Comment': '',
            }
