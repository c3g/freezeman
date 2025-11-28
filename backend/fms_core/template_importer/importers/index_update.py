from collections import defaultdict

from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.index_update import IndexUpdateRowHandler
from fms_core.templates import INDEX_UPDATE_TEMPLATE

from fms_core.models import Index
from fms_core.utils import str_cast_and_normalize
from fms_core.services.index import validate_indices, validate_distance_matrix

class IndexUpdateImporter(GenericImporter):
    SHEETS_INFO = INDEX_UPDATE_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()

    def import_template_inner(self):
        index_update_sheet = self.sheets['Library']
        samples_affected_by_row = defaultdict(set)
        samples_affected = set()
        mapping_index_to_rows = defaultdict(list)
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
            mapping_index_to_rows[index['new_index']].append(row_id)
            samples_affected_by_row[row_id].update(row_object.get("Samples Impacted", []))
            samples_affected.update(row_object.get("Samples Impacted", []))
        
        # Once all updates are done validate collisions for all affected samples
        warnings_by_row = defaultdict(list)
        for sample in samples_affected:
            indices = Index.objects.filter(libraries__derived_sample__samples__id=sample.id)
            if len(indices) > 1:
                results, _, _ = validate_indices(indices=indices, threshold=0)
                if not results["is_valid"]:
                    header = results["header"]
                    distance_matrix = results["distances"]
                    _, collisions = validate_distance_matrix(distance_matrix, 0)
                    for x, y in collisions:
                        index_id_x = header[x]
                        index_id_y = header[y]
                        try:
                            index_x = Index.objects.get(id=index_id_x)
                        except:
                            self.base_errors.append(f"Failed to find index id {index_id_x} during validation.")
                        try:
                            index_y = Index.objects.get(id=index_id_y)
                        except:
                            self.base_errors.append(f"Failed to find index id {index_id_y} during validation.")
                        warning_row_ids = mapping_index_to_rows.get(index_x.name, None)
                        if warning_row_ids is None:
                            # if the conflicting index reported is not the same.
                            warning_row_ids = mapping_index_to_rows.get(index_y.name, None)
                        for warning_row_id in warning_row_ids:
                            if sample in samples_affected_by_row.get(warning_row_id, set()): # ensure the warning applies to the given row
                                warnings_by_row[warning_row_id].append(("Pooled library {0} (Sample ID {1}) would have a conflict between index {2} and index {3}.", [sample.name, sample.id, index_x.name, index_y.name]))

        for row_id, warnings in warnings_by_row.items():
            duplicate_filtering_dict = defaultdict(list)
            for format, args in warnings:
                if not args in duplicate_filtering_dict.get(format, []):
                    duplicate_filtering_dict[format].append(args)
                    combined_warnings = index_update_sheet.rows_results[row_id]["warnings"]
                    combined_warnings.append({"key": "index collisions","format": format, "args": args})
                    index_update_sheet.rows_results[row_id].update(warnings=combined_warnings)
