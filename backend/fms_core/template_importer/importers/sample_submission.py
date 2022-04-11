from fms_core.models import SampleKind
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_submission import SampleRowHandler
from fms_core.templates import SAMPLE_SUBMISSION_TEMPLATE
from .._utils import float_to_decimal_and_none, input_to_date_and_none

PROPERTIES_STARTING_INDEX = 29

class SampleSubmissionImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_SUBMISSION_TEMPLATE["sheets info"]
    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX

    def initialize_data_for_template(self):
        self.preloaded_data = {'sample_kind_objects_by_name': {}}
        self.preloaded_data['sample_kind_objects_by_name'] = {sample_kind.name: sample_kind for sample_kind in SampleKind.objects.all()}

    def import_template_inner(self):
        samples_sheet = self.sheets['SampleSubmission']

        for row_id, row in enumerate(samples_sheet.rows):
            sample_submission_dict = {}
            extra_properties = {}
            for i, (key, val) in enumerate(row.items()):
                if i < self.properties_starting_index:
                    sample_submission_dict[key] = row[key]
                else:
                    extra_properties[key] = val

            container = {
                'kind': sample_submission_dict['Container Kind'],
                'name': sample_submission_dict['Container Name'],
                'barcode': sample_submission_dict['Container Barcode'],
                'coordinates': sample_submission_dict['Container Coord'],
            }
            parent_container = {
                'barcode': sample_submission_dict['Location Barcode'],
            }
            individual = {
                'name': sample_submission_dict['Individual ID'],
                'sex': sample_submission_dict['Sex'],
                'pedigree': sample_submission_dict['Pedigree'],
                'taxon': sample_submission_dict['NCBI Taxon ID #'],
                'cohort': sample_submission_dict['Cohort'],
            }
            individual_mother = {
                'name': sample_submission_dict['Mother ID'],
            }
            individual_father = {
                'name': sample_submission_dict['Father ID'],
            }
            library = {
                'library_type': sample_submission_dict['Library Type'],
                'index': sample_submission_dict['Index'],
                'platform': sample_submission_dict['Platform'],
                'strandedness': sample_submission_dict['Strandedness'],
            }
            project = {
                'name': sample_submission_dict['Project'],
            }
            sample = {
                'name': sample_submission_dict['Sample Name'],
                'alias': sample_submission_dict['Alias'],
                'experimental_group': sample_submission_dict['Experimental Group'],
                'concentration': float_to_decimal_and_none(sample_submission_dict['Conc. (ng/uL)']),
                'volume': float_to_decimal_and_none(sample_submission_dict['Volume (uL)']),
                'collection_site': sample_submission_dict['Collection Site'],
                'tissue_source': sample_submission_dict['Tissue Source'],
                'creation_date': input_to_date_and_none(sample_submission_dict['Reception Date']),
                'comment': sample_submission_dict['Comment'],
                'coordinates': sample_submission_dict['Sample Coord'],
                'sample_kind': sample_submission_dict['Sample Kind'],
                'properties': extra_properties,
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
