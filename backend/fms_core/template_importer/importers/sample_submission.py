from fms_core.models import SampleKind
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_submission import SampleRowHandler
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

        for row_id, row_data in enumerate(samples_sheet.rows):
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
                'creation_date': input_to_date_and_none(row_data['Reception Date']),
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

            (result, _) = self.handle_row(
                row_handler_class=SampleRowHandler,
                sheet=samples_sheet,
                row_i=row_id,
                **sample_kwargs,
            )
