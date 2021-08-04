from ._generic import GenericImporter
from fms_core.import_tool.object_creators import create_experiment_run

class ExperimentRunImporter(GenericImporter):
    sheet_names = ['Experiments', 'Sample Preparation']
    base_errors = []

    def __init__(self, file, format):
        super().__init__(file, format)

    def import_template(self):
        experiment_run_dict = {}

        # For the Experiments sheet
        experiments_sheet = self.sheets['Experiments']
        for row_id in range(len(experiments_sheet)):
            properties = {}

            for i, (key, val) in enumerate(experiments_sheet.iloc[row_id].items()):
                print('experiment sheet key ', key)
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


            print('experiment temporary id', experiment_temporary_id)


            samples_sheet = self.sheets['Sample Preparation']
            for row_id in range(len(samples_sheet)):

                if samples_sheet.iloc[row_id]['Experiment ID'] == experiment_temporary_id:
                    row_data = samples_sheet.iloc[row_id]
                    sample = {'row_id': row_id,
                              'container_barcode': row_data['Source Container Barcode'],
                              'container position': row_data['Source Container Position'],
                              'volume_used': row_data['Source Sample Volume Used'],
                              'experiment_container_position': row_data['Experiment Container Position']}
                    samples.append(sample)

            create_experiment_run(instrument=instrument,
                                  container=container,
                                  start_date=start_date,
                                  samples=samples,
                                  properties=properties
                                  )