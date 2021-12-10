from fms_core.models import RunType, PropertyType
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.experiment_run import ExperimentRunRowHandler, SampleRowHandler
from collections import defaultdict
from datetime import datetime
from .._utils import float_to_decimal_and_none

PROPERTIES_STARTING_INDEX = 5

class ExperimentRunImporter(GenericImporter):
    SHEETS_INFO = [
        {
            'name': 'Experiments',
            'headers': ['Experiment Name', 'Experiment Container Barcode', 'Experiment Container Kind',
                        'Instrument Name', 'Experiment Start Date'],
        },
        {
            'name': 'Samples',
            'headers': ['Experiment Name', 'Source Container Barcode', 'Source Container Coordinates', 'Source Sample Volume Used',
                        'Experiment Container Coordinates'],
        },
    ]

    def __init__(self):
        super().__init__()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX


    def initialize_data_for_template(self, runtype, properties):
        self.preloaded_data = {'run_type': {}, 'protocols_dict': {}, 'property_types_by_name': {}}

        # Preload RunType and Protocols dict
        try:
            self.preloaded_data['run_type'] = RunType.objects.get(name=runtype)

            # Preload Protocols objects for this run type in a dictionary for faster access
            self.preloaded_data['protocols_dict'] = self.preloaded_data['run_type'].get_protocols_dict

        except Exception as e:
            self.base_errors.append(f"No type type with name {runtype} could be found.")

        # Preload PropertyType objects for this experiment type in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = {o.name: {'property_type_obj': o} for o in list(PropertyType.objects.filter(name__in=properties))}
        except Exception as e:
            self.base_errors.append(f"Property Type could not be found. {e}")

    def import_template_inner(self):
        """
            SAMPLES SHEET
        """
        samples_sheet = self.sheets['Samples']
        sample_rows_data = defaultdict(list)
        for i, row_data in enumerate(samples_sheet.rows):
            sample = {'experiment_name': row_data['Experiment Name'],
                      'volume_used': float_to_decimal_and_none(row_data['Source Sample Volume Used']),
                      'experiment_container_coordinates': row_data['Experiment Container Coordinates']
                      }

            sample_kwargs = dict(
                barcode=row_data['Source Container Barcode'],
                coordinates=row_data['Source Container Coordinates'],
                volume_used=sample['volume_used']
            )

            (result, sample['sample_obj']) = self.handle_row(
                row_handler_class=SampleRowHandler,
                sheet=samples_sheet,
                row_i=i,
                **sample_kwargs,
            )

            sample_rows_data[sample['experiment_name']].append(sample)

        """
            EXPERIMENTS SHEET
        """
        experiments_sheet = self.sheets['Experiments']
        experiments_df = experiments_sheet.dataframe


        # PRELOADING - Set values for global data
        runtype_name = experiments_df.values[1][1]

        self.initialize_data_for_template(runtype=runtype_name,
                                          properties=experiments_df.values[experiments_sheet.header_row_nb][self.properties_starting_index:].tolist())

        # Iterate through experiment rows
        for row_id, row in enumerate(experiments_sheet.rows):
            experiment_run_dict = {}
            process_properties = self.preloaded_data['process_properties']
            for i, (key, val) in enumerate(row.items()):
                if i < self.properties_starting_index:
                    experiment_run_dict[key] = row[key]
                else:
                    process_properties[key]['value'] = val

            experiment_run_kwargs = dict(
                # ExperimentRun attributes data dictionary and related objects
                experiment_run_name=experiment_run_dict['Experiment Name'],
                instrument={'name': experiment_run_dict['Instrument Name']},
                container={'barcode': experiment_run_dict['Experiment Container Barcode'],
                           'kind': experiment_run_dict['Experiment Container Kind']},
                start_date=experiment_run_dict['Experiment Start Date'],
                comment=f"Automatically generated via experiment run creation on {datetime.utcnow().isoformat()}Z",
                # Additional data for this row
                process_properties=process_properties,
                sample_rows_info=sample_rows_data[experiment_run_dict['Experiment Name']],
                # Preloaded data
                run_type_obj=self.preloaded_data['run_type'],
                protocols_dict=self.preloaded_data['protocols_dict'],
            )

            (result, _) = self.handle_row(
                row_handler_class=ExperimentRunRowHandler,
                sheet=experiments_sheet,
                row_i=row_id,
                **experiment_run_kwargs,
            )