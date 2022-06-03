from fms_core.utils import convert_concentration_from_nm_to_ngbyul
from fms_core.services.sample import get_sample_from_container
from fms_core.template_importer.row_handlers._generic import GenericRowHandler

class LibraryQCRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, container, measures, qc):
         # Get the library sample that was checked
        source_sample_obj, self.errors['container'], self.warnings['container'] = \
            get_sample_from_container(barcode=container['barcode'], coordinates=container['coordinates'])

        if source_sample_obj is None:
            self.errors['sample_source'] = 'Library sample for QC was not found at the specified container.'
            return

        # volume
        if measures['initial_volume'] is None and measures['measured_volume'] is None:
            self.errors['measured_volume'] = 'Either measured or initial volume must be specified.'
            return

        if measures['volume_used'] is None:
            self.errors['volume_used'] = 'Volume used must be specified.'
            return

        final_volume = measures['measured_volume'] if measures['measured_volume'] is not None else measures['initial_volume']
        final_volume -= measures['volume_used']

        # concentration
        if measures['concentration_nm'] is not None and measures['concentration_uL'] is not None:
            self.warning['concentration'] = 'The concentration should be specified in nM or uL, not both. nM will be ignored.'

        concentration = measures['concentration_uL']
        if concentration is None:
            concentration = measures['concentration_nm']
            if concentration is None:
                self.error['concentration'] = 'A concentration in either nM or uL must be specified.'
            else:
                molecular_weight = source_sample_obj.derived_sample_not_pool.library.molecular_weight_approx
                molecule_count = source_sample_obj.derived_sample_not_pool.library.library_size
                concentration = convert_concentration_from_nm_to_ngbyul(concentration, molecular_weight, molecule_count)
                if concentration is None:
                    self.error['concentration'] = 'Concentration could not be converted from nM to ng/uL'

        # quality
        if qc['quality_instrument'] is None:
            self.error['qc'] = 'Quality instrument must be specified'
        if qc['quality_flag'] is None:
            self.error['qc'] = 'Quality flag must be specified'
        if qc['quantity_instrument'] is None:
            self.error['qc'] = 'Quantity instrument must be specified'
        if qc['quantity_flag'] is None:
            self.error['qc'] = 'Quantity flag must be specified'
        if qc['date'] is None:
            self.error['qc'] = 'QC date must be specified'
            # TODO verify valid date format
        
        

        




        


        