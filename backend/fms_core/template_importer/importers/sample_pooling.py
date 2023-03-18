from fms_core.models import Protocol
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_pooling import SamplesToPoolRowHandler, PoolsRowHandler
from fms_core.templates import SAMPLE_POOLING_TEMPLATE
from collections import defaultdict
from fms_core.services.step import get_step_from_template
from .._utils import float_to_decimal_and_none, input_to_date_and_none
from fms_core.utils import str_cast_and_normalize, str_cast_and_normalize_lower, check_truth_like

class SamplePoolingImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_POOLING_TEMPLATE['sheets info']

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        self.preloaded_data = {'protocol': Protocol.objects.get(name='Sample Pooling')}

    def import_template_inner(self):
        pools_dict = defaultdict(list)
        samplestopool_sheet = self.sheets['SamplesToPool']
        pools_sheet = self.sheets['Pools']

         # Identify for each row of the matching workflow step
        step_by_row_id, errors, warnings = get_step_from_template(self.preloaded_data['protocol'], self.sheets, self.SHEETS_INFO)
        self.base_errors.extend(errors)

        """
            SamplesToPool SHEET
        """
        
        pool_set = set(row_data["Pool Name"] for row_data in pools_sheet.rows)
        result_list = []
        for i, row_data in enumerate(samplestopool_sheet.rows):
            pool_name = str_cast_and_normalize(row_data["Pool Name"])
            samplestopool_kwargs = {
                "source_sample": {
                    "barcode": str_cast_and_normalize(row_data["Source Container Barcode"]),
                    "coordinates": str_cast_and_normalize(row_data["Source Container Coord"]),
                    "depleted": check_truth_like(row_data["Source Depleted"]) if row_data["Source Depleted"] else None,
                },
                "pool": {
                  "pool_set": pool_set,
                  "pool_name": pool_name,
                },
                "volume_used": float_to_decimal_and_none(row_data["Volume Used (uL)"]),
                "comment": str_cast_and_normalize(row_data["Comment"]),
                "workflow":
                    {"step_action": str_cast_and_normalize(row_data["Workflow Action"]),
                     "step": step_by_row_id[i]
                    },
            }

            (result, row_object) = self.handle_row(
                row_handler_class=SamplesToPoolRowHandler,
                sheet=samplestopool_sheet,
                row_i=i,
                **samplestopool_kwargs,
            )
            result_list.append(result)
            if pool_name is not None:
                pools_dict[pool_name].append(row_object)

        if not any(result['validation_error'].messages for result in result_list): # prevent the repetition of error messages for volume_used at the level of pools.
            """
                POOLS SHEET
            """

            # Iterate through libraries rows
            for row_id, row_data in enumerate(pools_sheet.rows):
                pool_kwargs = {
                    "pool": {
                        "name": str_cast_and_normalize(row_data["Pool Name"]),
                        "coordinates": str_cast_and_normalize(row_data["Destination Container Coord"]),
                        "container": {
                            "barcode": str_cast_and_normalize(row_data["Destination Container Barcode"]),
                            "name": str_cast_and_normalize(row_data["Destination Container Name"]),
                            "kind": str_cast_and_normalize_lower(row_data["Destination Container Kind"]),
                            "coordinates": str_cast_and_normalize(row_data["Destination Parent Container Coord"]),
                            "parent_barcode": str_cast_and_normalize(row_data["Destination Parent Container Barcode"]),
                        },
                    },
                    "seq_instrument_type": str_cast_and_normalize(row_data["Seq Instrument Type"]),
                    "pooling_date": input_to_date_and_none(row_data["Pooling Date (YYYY-MM-DD)"]),
                    "comment": str_cast_and_normalize(row_data["Comment"]),
                }

                (result, _) = self.handle_row(
                    row_handler_class=PoolsRowHandler,
                    sheet=pools_sheet,
                    row_i=row_id,
                    protocol=self.preloaded_data['protocol'],
                    imported_template=self.imported_file,
                    samples_info=pools_dict.get(str_cast_and_normalize(row_data['Pool Name']), None),
                    **pool_kwargs
                )

        

