from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.index_update import IndexUpdateRowHandler
from fms_core.templates import INDEX_UPDATE_TEMPLATE

from fms_core.models import Index
from fms_core.utils import str_cast_and_normalize
from fms_core.services.index import validate_indices

class IndexUpdateImporter(GenericImporter):
    SHEETS_INFO = INDEX_UPDATE_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        index_update_sheet = self.sheets['Library']
        samples_affected = set()
        for row_id, row_data in enumerate(index_update_sheet.rows):
            library = {
                'alias': str_cast_and_normalize(row_data['Library Name']),
                'barcode': str_cast_and_normalize(row_data['Library Container Barcode']),
                'coordinates': str_cast_and_normalize(row_data['Library Container Coord'])
            }
            index = {
                'old_index': str_cast_and_normalize(row_data['Old Index Name']),
                'new_index': str_cast_and_normalize(row_data['New Index Name']),
            }

            index_update_kwargs = dict(
                library=library,
                index=index,
            )

            (result, row_object) = self.handle_row(
                row_handler_class=IndexUpdateRowHandler,
                sheet=index_update_sheet,
                row_i=row_id,
                **index_update_kwargs,
            )
            print(row_object)
            samples_affected.update(row_object["Samples Impacted"])
        
        # Once all updates are done validate collisions for all affected samples
        for sample in samples_affected:
            print(sample)
            indices = Index.objects.filter(libraries__derived_sample__samples__id=sample.id)
            if len(indices) > 1:
                results, _, _ = validate_indices(indices=indices, threshold=0)
                if not results["is_valid"]:
                    print(results)
                    #self.warnings["index collision"].append(("Index {0} collide with an existing index in pooled library {1} with ID [{2}].", [index.name, sample.name, sample.id]))