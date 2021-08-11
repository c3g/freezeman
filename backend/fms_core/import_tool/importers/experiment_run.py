from fms_core.models import ExperimentType, PropertyType
from ._generic import GenericImporter
from fms_core.import_tool.handlers import ExperimentRunHandler
from .._utils import (data_row_ids_range,
                      convert_property_value_to_str)


class ExperimentRunImporter(GenericImporter):
    preloaded_data = {'experiment_type': None, 'protocols_dict': {}, 'property_types_by_name': {}}


    def __init__(self):
        self.sheet_names = ['Experiments', 'Samples']
        super().__init__()


    def preload_data_from_template(self, workflow, properties):
        # Preload ExperimentType and Protocols dict
        try:
            self.preloaded_data['experiment_type'] = ExperimentType.objects.get(workflow=workflow)

            # Preload Protocols objects for this experiment type in a dictionary for faster access
            self.preloaded_data['protocols_dict'] = self.preloaded_data['experiment_type'].get_protocols_dict
        except Exception as e:
            self.base_errors.append(f"No experiment type with workflow {workflow} could be found.")

        # Preload PropertyType objects for this experiment type in a dictionary for faster access
        for property_column in properties:
            try:
                self.preloaded_data['property_types_by_name'][property_column] = PropertyType.objects.get(
                    name=property_column)
            except Exception as e:
                self.base_errors.append(f"Property Type {property_column} could not be found")


    def import_template_inner(self):
        """
            SAMPLES SHEET
        """
        samples_sheet = self.sheets['Samples']
        samples_row_header = 2
        samples_sheet.columns = samples_sheet.values[samples_row_header]

        sample_rows_data = []

        for row_id in data_row_ids_range(samples_row_header + 1, samples_sheet):
            row_data = samples_sheet.iloc[row_id]
            sample = {'row_id': row_id,
                      'experiment_id': row_data['Experiment ID'],
                      'container_barcode': row_data['Source Container Barcode'],
                      'container_coordinates': row_data['Source Container Position'],
                      'volume_used': row_data['Source Sample Volume Used'],
                      'experiment_container_coordinates': row_data['Experiment Container Position']
                      }
            sample_rows_data.append(sample)


        """
            EXPERIMENTS SHEET
        """
        experiments_sheet = self.sheets['Experiments']
        properties_starting_index = 6
        experiments_header_row_nb = 8
        # Setting headers for Experiments sheet Experiments rows
        experiments_sheet.columns = experiments_sheet.values[experiments_header_row_nb]


        workflow_value = experiments_sheet.values[1][2]

        # PRELOADING - Set values for global data
        self.preload_data_from_template(workflow=workflow_value,
                                        properties=experiments_sheet.values[experiments_header_row_nb][properties_starting_index:].tolist())


        experiment_rows_data = []
        # Iterate through experiment rows
        for row_id in data_row_ids_range(experiments_header_row_nb+1, experiments_sheet):
            experiment_run_dict = {}
            properties = {}
            row = experiments_sheet.iloc[row_id]
            for i, (key, val) in enumerate(row.items()):
                if i < properties_starting_index:
                    experiment_run_dict[key] = row[key]
                else:
                    properties[key] = experiments_sheet.iloc[row_id][key]

            container = {
                'barcode': experiment_run_dict['Experiment Container Barcode'],
                'kind': experiment_run_dict['Experiment Container Kind']
            }
            instrument = {'name': experiment_run_dict['Instrument Name']}

            start_date = experiment_run_dict['Experiment Start Date']

            required_data = [container['barcode'], instrument['name'], start_date]
            if self.is_empty_row(required_data):
                pass
            else:
                experiment_temporary_id = experiment_run_dict['Experiment ID']
                filtered_data = filter(lambda x: x['experiment_id'] == experiment_temporary_id, sample_rows_data)
                experiment_sample_rows_data = list(filtered_data)

                print('importers exp run - sample rows for exp ', experiment_sample_rows_data)

                experiment_run_handler = ExperimentRunHandler(
                    experiment_type_obj=self.preloaded_data['experiment_type'],
                    instrument=instrument,
                    container=container,
                    start_date=start_date,
                    sample_rows=experiment_sample_rows_data,
                    properties=properties,
                    protocols_dict=self.preloaded_data['protocols_dict'],
                    properties_by_name_dict=self.preloaded_data['property_types_by_name'],
                )

                if experiment_run_handler.has_errors():
                    self.is_valid = False

                result = experiment_run_handler.get_result()
                row_list_str = list(map(lambda x: convert_property_value_to_str(x), row.values.flatten().tolist()))
                result['diff'] = row_list_str

                experiment_rows_data.append(result)

        if self.base_errors != []:
            self.is_valid = False


        return {
            "headers": experiments_sheet.columns.tolist(),
            "valid": self.is_valid,
            "base_errors": self.base_errors,
            "rows": experiment_rows_data,
        }