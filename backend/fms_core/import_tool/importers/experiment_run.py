from ._generic import GenericImporter
from fms_core.import_tool.creators import create_experiment_run
from .._utils import data_row_ids_range

class ExperimentRunImporter(GenericImporter):
    base_errors = []

    def __init__(self, file, format):
        self.sheet_names = ['Experiments', 'Samples']
        super().__init__(file, format)

    def import_template(self):
        experiment_run_dict = {}

        # For the Experiments sheet
        experiments_sheet = self.sheets['Experiments']

        # Getting single cell data for Experiment Type workflow value
        experiment_type = {'workflow': experiments_sheet.values[1][2]}


        # Experiments rows

        # Setting headers for Experiments sheet Experiments rows
        experiments_row_header = 8
        experiments_sheet.columns = experiments_sheet.values[experiments_row_header]

        # Iterate through experiment rows
        for row_id in data_row_ids_range(experiments_row_header+1, experiments_sheet):
            properties = {}
            for i, (key, val) in enumerate(experiments_sheet.iloc[row_id].items()):
                if i < 6:
                    experiment_run_dict[key] = experiments_sheet.iloc[row_id][key]
                else:
                    properties[key] = experiments_sheet.iloc[row_id][key]

            container = {'barcode': experiment_run_dict['Experiment Container Barcode'],
                         'kind': experiment_run_dict['Experiment Container Kind']}
            instrument = {'name': experiment_run_dict['Instrument Name']}

            start_date = experiment_run_dict['Experiment Start Date']

            samples = []

            experiment_temporary_id = experiment_run_dict['Experiment ID']

            # Handle Samples sheet
            samples_sheet = self.sheets['Samples']
            samples_row_header = 2
            samples_sheet.columns = samples_sheet.values[samples_row_header]

            for row_id in data_row_ids_range(samples_row_header+1, samples_sheet):
                if samples_sheet.iloc[row_id]['Experiment ID'] == experiment_temporary_id:
                    row_data = samples_sheet.iloc[row_id]
                    sample = {'row_id': row_id,
                              'container_barcode': row_data['Source Container Barcode'],
                              'container position': row_data['Source Container Position'],
                              'volume_used': row_data['Source Sample Volume Used'],
                              'experiment_container_position': row_data['Experiment Container Position']}
                    samples.append(sample)


            create_experiment_run(experiment_type=experiment_type,
                                  instrument=instrument,
                                  container=container,
                                  start_date=start_date,
                                  samples=samples,
                                  properties=properties
                                  )