from fms_core.models import SampleKind
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_submission import SampleRowHandler
from fms_core.templates import SAMPLE_SUBMISSION_TEMPLATE
from .._utils import float_to_decimal_and_none, input_to_date_and_none

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
                'kind': row_data['Container Kind'],
                'name': row_data['Container Name'],
                'barcode': row_data['Container Barcode'],
                'coordinates': row_data['Container Coord'],
            }
            parent_container = {
                'barcode': row_data['Location Barcode'],
            }
            individual = {
                'name': row_data['Individual ID'],
                'sex': row_data['Sex'],
                'pedigree': row_data['Pedigree'],
                'taxon': row_data['NCBI Taxon ID #'],
                'cohort': row_data['Cohort'],
            }
            individual_mother = {
                'name': row_data['Mother ID'],
            }
            individual_father = {
                'name': row_data['Father ID'],
            }
            library = {
                'library_type': row_data['Library Type'],
                'index': row_data['Index'],
                'platform': row_data['Platform'],
                'strandedness': row_data['Strandedness'],
            }
            project = {
                'name': row_data['Project'],
            }
            sample = {
                'name': row_data['Sample Name'],
                'alias': row_data['Alias'],
                'experimental_group': row_data['Experimental Group'],
                'concentration': float_to_decimal_and_none(row_data['Conc. (ng/uL)']),
                'volume': float_to_decimal_and_none(row_data['Volume (uL)']),
                'collection_site': row_data['Collection Site'],
                'tissue_source': row_data['Tissue Source'],
                'creation_date': input_to_date_and_none(row_data['Reception Date']),
                'comment': row_data['Comment'],
                'coordinates': row_data['Sample Coord'],
                'sample_kind': row_data['Sample Kind'],
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
