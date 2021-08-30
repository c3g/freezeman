from fms_core.models import SampleKind
from ._generic import GenericImporter
from fms_core.import_tool.row_handlers.sample_submission import SampleRowHandler

class SampleSubmissionImporter(GenericImporter):
    SHEETS_INFO = [
        {'name': 'SampleSubmission', 'header_row_nb': 5},
    ]

    def __init__(self):
        super().__init__()
        # Preload objects accessible to the whole template (not only by row)
        self.preload_data_from_template()

    def preload_data_from_template(self):
        self.preloaded_data = {'sample_kind_objects_by_name': {}}

        for sample_kind in SampleKind.objects.all():
            self.preloaded_data['sample_kind_objects_by_name'].update({sample_kind.name: sample_kind})

    def import_template_inner(self):
        print('Import Sample Submission Sheet - import template inner')
        samples_sheet = self.sheets['SampleSubmission']

        for row_id, row_data in enumerate(samples_sheet.rows):
            container = {
                'kind': row_data['Container Kind'],
                'name': row_data['Container Name'],
                'barcode': row_data['Container Barcode'],
            }
            parent_container = {
                'barcode': row_data['Location Barcode'],
            }
            individual = {
                'name': row_data['Individual ID'],
                'sex': row_data['Sex'],
                'pedigree': row_data['Pedigree'],
                'taxon': row_data['Taxon'],
                'cohort': row_data['Cohort'],
            }
            individual_mother = {
                'name': row_data['Mother ID'],
            }
            individual_father = {
                'name': row_data['Father ID'],
            }
            sample = {
                'name': row_data['Sample Name'],
                'alias': row_data['Alias'],
                'experimental_group': row_data['Experimental Group'],
                'concentration': row_data['Conc. (ng/uL)'],
                'volume': row_data['Volume (uL)'],
                'collection_site': row_data['Collection Site'],
                'tissue_source': row_data['Tissue Source'],
                'creation_date': row_data['Reception Date'],
                'phenotype': row_data['Phenotype'],
                'comment': row_data['Comment'],
                'coordinates': row_data['Location Coord'],
                'sample_kind': row_data['Sample Kind'],
            }

            sample_row_handler = SampleRowHandler()
            result = sample_row_handler.process_row(
                sample=sample,
                container=container,
                parent_container=parent_container,
                individual=individual,
                individual_mother=individual_mother,
                individual_father=individual_father,
                # Preloaded data
                sample_kind_objects_by_name=self.preloaded_data['sample_kind_objects_by_name'],
            )

            samples_sheet.rows_results[row_id].update(**result)






