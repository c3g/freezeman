from fms_core.models import ExperimentType, PropertyType
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.experiment_run import ExperimentRunRowHandler, SampleRowHandler
from collections import defaultdict
from datetime import datetime

class ExperimentRunImporter(GenericImporter):
    SHEETS_INFO = [
        {
            'name': 'Experiments',
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
            'properties_starting_index': 5
        },
        {
            'name': 'Samples',
            'headers': ['Experiment ID', 'Source Container Barcode', 'Source Container Position', 'Source Sample Volume Used',
                        'Experiment Container Position'],
        },
    ]

    def __init__(self):
        super().__init__()


    def initialize_data_for_template(self, workflow, properties):
        self.preloaded_data = {'experiment_type': {}, 'protocols_dict': {}, 'property_types_by_name': {}}

        # Preload ExperimentType and Protocols dict
        try:
            self.preloaded_data['experiment_type'] = ExperimentType.objects.get(workflow=workflow)

            # Preload Protocols objects for this experiment type in a dictionary for faster access
            self.preloaded_data['protocols_dict'] = self.preloaded_data['experiment_type'].get_protocols_dict

        except Exception as e:
            self.base_errors.append(f"No experiment type with workflow {workflow} could be found.")

        # Preload PropertyType objects for this experiment type in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = {o.name: {'type_obj': o} for o in list(PropertyType.objects.filter(name__in=properties))}
        except Exception as e:
            self.base_errors.append(f"Property Type could not be found. {e}")

    def import_template_inner(self):
        """
            SAMPLES SHEET
        """
        samples_sheet = self.sheets['Samples']
        sample_rows_data = defaultdict(list)
        for i, row_data in enumerate(samples_sheet.rows):
            sample = {'experiment_id': row_data['Experiment ID'],
                      'volume_used': row_data['Source Sample Volume Used'],
                      'experiment_container_coordinates': row_data['Experiment Container Position']
                      }

            sample_kwargs = dict(
                barcode=row_data['Source Container Barcode'],
                coordinates=row_data['Source Container Position'],
                volume_used=sample['volume_used']
            )

            (result, sample['sample_obj']) = self.handle_row(
                row_handler_class=SampleRowHandler,
                sheet=samples_sheet,
                row_i=i,
                **sample_kwargs,
            )

            sample_rows_data[sample['experiment_id']].append(sample)

        """
            EXPERIMENTS SHEET
        """
        experiments_sheet = self.sheets['Experiments']
        experiments_df = experiments_sheet.dataframe


        # PRELOADING - Set values for global data
        workflow_value = experiments_df.values[1][1]

        self.initialize_data_for_template(workflow=workflow_value,
                                          properties=experiments_df.values[experiments_sheet.header_row_nb][experiments_sheet.properties_starting_index:].tolist())

        # Iterate through experiment rows
        for row_id, row in enumerate(experiments_sheet.rows):
            experiment_run_dict = {}
            process_properties = self.preloaded_data['process_properties']
            for i, (key, val) in enumerate(row.items()):
                if i < experiments_sheet.properties_starting_index:
                    experiment_run_dict[key] = row[key]
                else:
                    process_properties[key]['value'] = val

            experiment_run_kwargs = dict(
                # ExperimentRun attributes data dictionary and related objects
                instrument={'name': experiment_run_dict['Instrument Name']},
                container={'barcode': experiment_run_dict['Experiment Container Barcode'],
                           'kind': experiment_run_dict['Experiment Container Kind']},
                start_date=experiment_run_dict['Experiment Start Date'],
                comment=f"Automatically generated via experiment run creation on {datetime.utcnow().isoformat()}Z",
                # Additional data for this row
                process_properties=process_properties,
                sample_rows_info=sample_rows_data[experiment_run_dict['Experiment ID']],
                # Preloaded data
                experiment_type_obj=self.preloaded_data['experiment_type'],
                protocols_dict=self.preloaded_data['protocols_dict'],
            )

            (result, _) = self.handle_row(
                row_handler_class=ExperimentRunRowHandler,
                sheet=experiments_sheet,
                row_i=row_id,
                **experiment_run_kwargs,
            )