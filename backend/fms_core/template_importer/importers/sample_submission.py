from fms_core.models import SampleKind
from ._generic import GenericImporter
from collections import defaultdict
from fms_core.template_importer.row_handlers.sample_submission import SampleRowHandler, PoolsRowHandler
from fms_core.templates import SAMPLE_SUBMISSION_TEMPLATE
from .._utils import float_to_decimal_and_none, input_to_date_and_none, input_to_integer_and_none
from fms_core.utils import str_cast_and_normalize, str_cast_and_normalize_lower

class SampleSubmissionImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_SUBMISSION_TEMPLATE["sheets info"]
    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        self.preloaded_data = {'sample_kind_objects_by_name': {}}
        self.preloaded_data['sample_kind_objects_by_name'] = {sample_kind.name: sample_kind for sample_kind in SampleKind.objects.all()}

    def import_template_inner(self):
        samples_sheet = self.sheets['SampleSubmission']

        # Pool submission information
        pools_sheet = self.sheets['PoolSubmission']
        pool_set = set(row_data["Pool Name"] for row_data in pools_sheet.rows)
        pools_dict = defaultdict(list)
        result_list = []

        for row_id, row_data in enumerate(samples_sheet.rows):
            pool_name = str_cast_and_normalize(row_data["Pool Name"])

            container = {
                'kind': str_cast_and_normalize_lower(row_data['Container Kind']),   # container kinds must be lower case to match model
                'name': str_cast_and_normalize(row_data['Container Name']),
                'barcode': str_cast_and_normalize(row_data['Container Barcode']),
                'coordinates': str_cast_and_normalize(row_data['Container Coord']),
            }
            parent_container = {
                'barcode': str_cast_and_normalize(row_data['Location Barcode']),
            }
            individual = {
                'name': str_cast_and_normalize(row_data['Individual ID']),
                'alias': str_cast_and_normalize(row_data['Individual Alias']),
                'sex': str_cast_and_normalize(row_data['Sex']),
                'pedigree': str_cast_and_normalize(row_data['Pedigree']),
                'taxon': input_to_integer_and_none(row_data['NCBI Taxon ID #']),
                'cohort': str_cast_and_normalize(row_data['Cohort']),
            }
            individual_mother = {
                'name': str_cast_and_normalize(row_data['Mother ID']),
            }
            individual_father = {
                'name': str_cast_and_normalize(row_data['Father ID']),
            }
            library = {
                'library_type': str_cast_and_normalize(row_data['Library Type']),
                'index': str_cast_and_normalize(row_data['Index']),
                'platform': str_cast_and_normalize(row_data['Platform']),
                'strandedness': str_cast_and_normalize(row_data['Strandedness']),
                'library_size': float_to_decimal_and_none(row_data['Library Size (bp)'], 0),
                'pool_name': pool_name
            }
            project = {
                'name': str_cast_and_normalize(row_data['Project']),
            }
            sample = {
                'name': str_cast_and_normalize(row_data['Sample Name']),
                'alias': str_cast_and_normalize(row_data['Alias']),
                'experimental_group': str_cast_and_normalize(row_data['Experimental Group']),
                'concentration': float_to_decimal_and_none(row_data['Conc. (ng/uL)']),
                'volume': float_to_decimal_and_none(row_data['Volume (uL)']),
                'collection_site': str_cast_and_normalize(row_data['Collection Site']),
                'tissue_source': str_cast_and_normalize(row_data['Tissue Source']).upper() if row_data['Tissue Source'] else None,
                'creation_date': input_to_date_and_none(row_data['Reception (YYYY-MM-DD)']),
                'comment': str_cast_and_normalize(row_data['Comment']),
                'coordinates': str_cast_and_normalize(row_data['Sample Coord']),
                'sample_kind': str_cast_and_normalize(row_data['Sample Kind']),
            }

            sample_kwargs = dict(
                sample=sample,
                library=library,
                container=container,
                project=project,
                parent_container=parent_container,
                individual=individual,
                individual_mother=individual_mother,
                individual_father=individual_father,
                # Preloaded data
                sample_kind_objects_by_name=self.preloaded_data['sample_kind_objects_by_name'],
            )

            (result, row_object) = self.handle_row(
                row_handler_class=SampleRowHandler,
                sheet=samples_sheet,
                row_i=row_id,
                **sample_kwargs,
            )

            result_list.append(result)
            if pool_name is not None:
                pools_dict[pool_name].append(row_object)

        # prevent the repetition of error messages at the level of pools.
        if not any(result['validation_error'].messages for result in result_list):
            """
                POOLS SHEET
            """
            # Iterate through libraries rows
            for row_id, row_data in enumerate(pools_sheet.rows):
                pool_kwargs = {
                    "pool": {
                        "name": str_cast_and_normalize(row_data["Pool Name"]),
                        "coordinates": str_cast_and_normalize(row_data["Pool Coord"]),
                        "container": {
                            "barcode": str_cast_and_normalize(row_data["Container Barcode"]),
                            "name": str_cast_and_normalize(row_data["Container Name"]),
                            "kind": str_cast_and_normalize_lower(row_data["Container Kind"]),
                            "coordinates": str_cast_and_normalize(row_data["Container Coord"]),
                            "parent_barcode": str_cast_and_normalize(row_data["Location Barcode"]),
                        },
                    },
                    "seq_instrument_type": str_cast_and_normalize(row_data["Seq Instrument Type"]),
                    "reception_date": input_to_date_and_none(row_data["Reception (YYYY-MM-DD)"]),
                    "comment": str_cast_and_normalize(row_data["Comment"]),
                }

                (result, _) = self.handle_row(
                    row_handler_class=PoolsRowHandler,
                    sheet=pools_sheet,
                    row_i=row_id,
                    samples_info=pools_dict.get(str_cast_and_normalize(row_data['Pool Name']), None),
                    **pool_kwargs
                )




