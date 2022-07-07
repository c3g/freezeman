from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.sample import get_sample_from_container, transfer_sample, update_sample

from fms_core.utils import check_truth_like, convert_concentration_from_nm_to_ngbyul


class NormalizationRowHandler(GenericRowHandler):

    def process_row_inner(self, source_sample, destination_sample, process_measurement):
        source_sample_obj, self.errors['sample'], self.warnings['sample'] = get_sample_from_container(
            barcode=source_sample['container']['barcode'],
            coordinates=source_sample['coordinates'])

        destination_container_dict = destination_sample['container']

        parent_barcode = destination_container_dict['parent_barcode']
        if parent_barcode:
            container_parent, self.errors['parent_container'], self.warnings['parent_container'] = get_container(
                barcode=parent_barcode)
        else:
            container_parent = None

        if source_sample and ((parent_barcode and container_parent) or not parent_barcode):
            destination_container, _, self.errors['container'], self.warnings['container'] = get_or_create_container(
                barcode=destination_container_dict['barcode'],
                kind=destination_container_dict['kind'],
                name=destination_container_dict['name'],
                coordinates=destination_container_dict['coordinates'],
                container_parent=container_parent)

            source_depleted = check_truth_like(source_sample['depleted']) if source_sample['depleted'] else None

            resulting_sample, self.errors['transfered_sample'], self.warnings['transfered_sample'] = transfer_sample(
                process=process_measurement['process'],
                sample_source=source_sample_obj,
                container_destination=destination_container,
                volume_used=process_measurement['volume_used'],
                execution_date=process_measurement['execution_date'],
                coordinates_destination=destination_sample['coordinates'],
                volume_destination=destination_sample['volume'],
                source_depleted=source_depleted,
                comment=process_measurement['comment'])

            # Update concentration
            if destination_sample['concentration_nm'] is None and destination_sample['concentration_uL'] is None:
                self.errors['concentration'] = 'A concentration in either nM or ng/uL must be specified.'

            if destination_sample['concentration_nm'] is not None and destination_sample['concentration_uL'] is not None:
                self.errors['concentration'] = 'Concentration must be specified in either nM or ng/uL, not both.'

            concentration = destination_sample['concentration_uL']
            if concentration is None:
                concentration = destination_sample['concentration_nm']
                if source_sample_obj.is_library:
                    library = source_sample_obj.derived_sample_not_pool.library
                    concentration = convert_concentration_from_nm_to_ngbyul(concentration,
                                                                            library.molecular_weight_approxm,
                                                                            library.library_size)

                    if concentration is None:
                        self.errors['concentration'] = 'Concentration could not be converted from nM to ng/uL'
                else:
                    self.errors['concentration'] = 'Concentration specified in nM should be only for libraries.'

            _, self.errors['concentration'], self.warnings['concentration'] = \
                update_sample(sample_to_update=resulting_sample, concentration=concentration)



