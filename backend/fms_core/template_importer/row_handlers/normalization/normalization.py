from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.models import ProcessMeasurement, DerivedBySample

from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.sample import get_sample_from_container, transfer_sample, update_sample, validate_normalization
from fms_core.services.property_value import create_process_measurement_properties
from fms_core.services.library import convert_library_concentration_from_nm_to_ngbyul
from fms_core.services.sample_next_step import execute_workflow_action

class NormalizationRowHandler(GenericRowHandler):
    """
         Extracts the information of each row in a template sheet and validates it.

         Returns:
             The errors and warnings of the row in question after validation.
    """

    def process_row_inner(self, source_sample, destination_sample, process_measurement, process_measurement_properties, workflow):
        # Check case when both concentrations are given or none are given
        if destination_sample['concentration_nm'] is None and destination_sample['concentration_ngul'] is None:
            self.errors['concentration'] = 'A concentration in either nM or ng/uL must be specified.'

        if destination_sample['concentration_nm'] is not None and destination_sample['concentration_ngul'] is not None:
            self.errors['concentration'] = 'Concentration must be specified in either nM or ng/uL, not both.'

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
            # Add a warning if the sample has failed qc
            if any([source_sample_obj.quality_flag is False, source_sample_obj.quantity_flag is False]):
                self.warnings["qc_flags"] = ("Source sample {0} has failed QC.", [source_sample_obj.name])

            concentration = None
            # Case when ng/uL is given
            if destination_sample['concentration_ngul'] is not None:
                concentration = destination_sample['concentration_ngul']
            # Case when nM is given
            elif destination_sample['concentration_nm'] is not None:
                if source_sample_obj.is_library:
                    # Calculate the concentration taking into account volume ratios
                    concentration, self.errors['concentration_conversion'], self.warnings['concentration_conversion'] = \
                        convert_library_concentration_from_nm_to_ngbyul(source_sample_obj, destination_sample['concentration_nm'])
                    if concentration is None:
                        self.errors['concentration'] = 'Concentration could not be converted from nM to ng/uL'
                else:
                    self.errors['concentration'] = 'Concentration specified in nM should be only for libraries.'

            is_concentration_valid, self.errors['concentration_validation'], self.warnings['concentration_validation'] \
                = validate_normalization(initial_volume=process_measurement['volume_used'],
                                         initial_concentration=source_sample_obj.concentration,
                                         final_volume=destination_sample['volume'],
                                         desired_concentration=concentration)

            destination_container, _, self.errors['container'], self.warnings['container'] = get_or_create_container(
                barcode=destination_container_dict['barcode'],
                kind=destination_container_dict['kind'],
                name=destination_container_dict['name'],
                coordinates=destination_container_dict['coordinates'],
                container_parent=container_parent_obj)

            resulting_sample, self.errors['transfered_sample'], self.warnings['transfered_sample'] = transfer_sample(
                process=process_measurement['process'],
                sample_source=source_sample_obj,
                container_destination=destination_container,
                volume_used=process_measurement['volume_used'],
                execution_date=process_measurement['execution_date'],
                coordinates_destination=destination_sample['coordinates'],
                volume_destination=destination_sample['volume'],
                source_depleted=source_sample['depleted'],
                comment=process_measurement['comment'])

            if resulting_sample and concentration is not None and is_concentration_valid:
                _, self.errors['concentration_update'], self.warnings['concentration_update'] = \
                    update_sample(sample_to_update=resulting_sample, concentration=concentration)

                # Set the process measurement properties
                process_measurement_properties['Final Volume (uL)']['value'] = destination_sample['volume']
                process_measurement_properties['Final Concentration (ng/uL)']['value'] = concentration

                # Create process measurement's properties
                process_measurement_obj = ProcessMeasurement.objects.get(source_sample=source_sample_obj,
                                                                         process=process_measurement['process'],
                                                                         lineage__child=resulting_sample)
                if process_measurement_obj:
                    properties_obj, self.errors['properties'], self.warnings[
                        'properties'] = create_process_measurement_properties(
                        process_measurement_properties,
                        process_measurement_obj)

                    # Process the workflow action
                    self.errors['workflow'], self.warnings['workflow'] = execute_workflow_action(workflow_action=workflow["step_action"],
                                                                                                 step=workflow["step"],
                                                                                                 current_sample=source_sample_obj,
                                                                                                 process_measurement=process_measurement_obj,
                                                                                                 next_sample=resulting_sample)
                else:
                    self.errors['process_measurement'] = 'Could not create the process measurement.'



