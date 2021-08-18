from fms_core.models import ExperimentType, PropertyType
from ._generic import GenericImporter
from fms_core.import_tool.row_handlers.experiment_run import ExperimentRunRowHandler, SampleRowHandler


class ExperimentRunImporter(GenericImporter):
    SHEETS_INFO = [
        {'name': 'Experiments', 'header_row_nb': 8,
         'minimally_required_columns': ['Experiment ID', 'Experiment Container Barcode']},
        {'name': 'Samples', 'header_row_nb': 2,
         'minimally_required_columns': ['Experiment ID', 'Source Container Barcode']},
    ]

    def __init__(self):
        super().__init__()


    def preload_data_from_template(self, workflow, properties):
        self.preloaded_data = {'experiment_type': None, 'protocols_dict': {}, 'property_types_by_name': {}}

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
        print('START SAMPLE SHEET')
        samples_sheet = self.sheets['Samples']
        sample_rows_data = []
        for i, row_data in enumerate(samples_sheet.rows):
            sample = {'experiment_id': row_data['Experiment ID'],
                      'volume_used': row_data['Source Sample Volume Used'],
                      'experiment_container_coordinates': row_data['Experiment Container Position']
                      }

            sample_row_handler = SampleRowHandler(row_identifier=i+1)
            result = sample_row_handler.process_row(barcode=row_data['Source Container Barcode'],
                                                    coordinates=row_data['Source Container Position'],
                                                    volume_used=sample['volume_used'])

            samples_sheet.rows_results[i].update(**result)

            sample['sample_obj'] = sample_row_handler.row_object
            sample_rows_data.append(sample)

        """
            EXPERIMENTS SHEET
        """
        print('START EXPERIMETN SHEET')
        experiments_sheet = self.sheets['Experiments']
        experiments_df = experiments_sheet.dataframe


        # PRELOADING - Set values for global data
        properties_starting_index = 6
        workflow_value = experiments_df.values[1][2]

        self.preload_data_from_template(workflow=workflow_value,
                                        properties=experiments_df.values[experiments_sheet.header_row_nb][properties_starting_index:].tolist())


        # Iterate through experiment rows
        for row_id, row in enumerate(experiments_sheet.rows):
            experiment_run_dict = {}
            properties = {}
            for i, (key, val) in enumerate(row.items()):
                if i < properties_starting_index:
                    experiment_run_dict[key] = row[key]
                else:
                    properties[key] = experiments_df.iloc[row_id][key]

            container = {
                'barcode': experiment_run_dict['Experiment Container Barcode'],
                'kind': experiment_run_dict['Experiment Container Kind']
            }
            instrument = {'name': experiment_run_dict['Instrument Name']}

            start_date = experiment_run_dict['Experiment Start Date']


            experiment_temporary_id = experiment_run_dict['Experiment ID']
            filtered_data = filter(lambda x: x['experiment_id'] == experiment_temporary_id, sample_rows_data)
            experiment_sample_rows_info = list(filtered_data)

            print('importers exp run - sample rows for exp ', experiment_sample_rows_info)

            er_row_handler = ExperimentRunRowHandler(row_identifier=row_id+1)
            result = er_row_handler.process_row(
                experiment_type_obj=self.preloaded_data['experiment_type'],
                instrument=instrument,
                container=container,
                start_date=start_date,
                sample_rows_info=experiment_sample_rows_info,
                properties=properties,
                protocols_dict=self.preloaded_data['protocols_dict'],
                properties_by_name_dict=self.preloaded_data['property_types_by_name'],
            )
            experiments_sheet.rows_results[row_id].update(**result)

