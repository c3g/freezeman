from fms_core.models import ExperimentType, PropertyType
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.experiment_run import ExperimentRunRowHandler, SampleRowHandler


class ExperimentRunImporter(GenericImporter):
    SHEETS_INFO = [
        {
            'name': 'Experiments', 'header_row_nb': 8,
            'headers': ['Experiment ID', 'Experiment Container Barcode', 'Experiment Container Kind', 'Instrument Name', 'Experiment Start Date',
                        'MSA3 Plate Barcode', '0.1N NaOH formulation date', 'Reagent MA1 Barcode', 'Reagent MA2 Barcode',
                        'Reagent MSM Barcode', 'Incubation time In Amplification', 'Incubation time Out Amplification', 'Comment Amplification',
                        'Reagent FMS Barcode', 'Comment Fragmentation', 'Reagent PM1 Barcode', 'Reagent RA1 Barcode Precipitation', 'Comment Precipitation',
                        'Hybridization Chip Barcodes', 'Hybridization Chamber Barcode', 'Reagent PB2 Barcode',
                        'Reagent XC4 Barcode Hybridization', 'Incubation time In Hybridization', 'Incubation time Out Hybridization', 'Comment Hybridization',
                        'Reagent PB1 Barcode Wash', 'Comment Wash',
                        '95% form/EDTA', 'Reagent ATM Barcode', 'Reagent EML Barcode', 'Reagent LX1 Barcode',
                        'Reagent LX2 Barcode', 'Reagent PB1 Barcode Stain', 'Reagent RA1 Barcode Stain',
                        'Reagent SML Barcode', 'Reagent XC3 Barcode', 'Reagent XC4 Barcode Stain', 'Comment Stain',
                        'SentrixBarcode_A', 'Scan Chip Rack Barcode', 'Comment Scan'],
        },
        {
            'name': 'Samples', 'header_row_nb': 2,
            'headers': ['Experiment ID', 'Source Container Barcode', 'Source Container Position', 'Source Sample Volume Used',
                        'Experiment Container Position'],
        },
    ]

    def __init__(self):
        super().__init__()


    def initialize_data_for_template(self, workflow, properties):
        self.preloaded_data = {'experiment_type': None, 'protocols_dict': {}, 'property_types_by_name': {}}

        # Preload ExperimentType and Protocols dict
        try:
            self.preloaded_data['experiment_type'] = ExperimentType.objects.get(workflow=workflow)

            # Preload Protocols objects for this experiment type in a dictionary for faster access
            self.preloaded_data['protocols_dict'] = self.preloaded_data['experiment_type'].get_protocols_dict
        except Exception as e:
            self.base_errors.append(f"No experiment type with workflow {workflow} could be found.")

        # Preload PropertyType objects for this experiment type in a dictionary for faster access
        try:
            self.preloaded_data['property_types_by_name'] = {o.name: o for o in list(PropertyType.objects.filter(name__in=properties))}
        except Exception as e:
            self.base_errors.append(f"Property Type could not be found. {e}")

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

            sample_kargs = dict(
                barcode=row_data['Source Container Barcode'],
                coordinates=row_data['Source Container Position'],
                volume_used=sample['volume_used']
            )

            (result, sample['sample_obj']) = self.handle_row(
                row_handler_class=SampleRowHandler,
                sheet=samples_sheet,
                row_i=i,
                **sample_kargs,
            )

            sample_rows_data.append(sample)

        """
            EXPERIMENTS SHEET
        """
        print('START EXPERIMENT SHEET')
        experiments_sheet = self.sheets['Experiments']
        experiments_df = experiments_sheet.dataframe


        # PRELOADING - Set values for global data
        properties_starting_index = 5
        workflow_value = experiments_df.values[1][1]

        self.initialize_data_for_template(workflow=workflow_value,
                                          properties=experiments_df.values[experiments_sheet.header_row_nb][properties_starting_index:].tolist())


        # Iterate through experiment rows
        for row_id, row in enumerate(experiments_sheet.rows):
            experiment_run_dict = {}
            properties = {}
            for i, (key, val) in enumerate(row.items()):
                if i < properties_starting_index:
                    experiment_run_dict[key] = row[key]
                else:
                    properties[key] = val

            experiment_temporary_id = experiment_run_dict['Experiment ID']
            experiment_sample_rows_info = [row_data for row_data in sample_rows_data if row_data['experiment_id'] == experiment_temporary_id ]
            print('importers exp run - sample rows for exp ', experiment_sample_rows_info)

            experiment_run_kwargs = dict(
                # ExperimentRun attributes data dictionaries
                instrument={
                    'name': experiment_run_dict['Instrument Name']
                },
                container={
                    'barcode': experiment_run_dict['Experiment Container Barcode'],
                    'kind': experiment_run_dict['Experiment Container Kind']
                },
                start_date=experiment_run_dict['Experiment Start Date'],
                # Additional data for this row
                sample_rows_info=experiment_sample_rows_info,
                properties=properties,
                # Preloaded data
                experiment_type_obj=self.preloaded_data['experiment_type'],
                protocols_dict=self.preloaded_data['protocols_dict'],
                properties_by_name_dict=self.preloaded_data['property_types_by_name'],
            )

            (result, _) = self.handle_row(
                row_handler_class=ExperimentRunRowHandler,
                sheet=experiments_sheet,
                row_i=row_id,
                **experiment_run_kwargs,
            )