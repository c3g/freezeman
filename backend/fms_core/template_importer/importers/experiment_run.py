from fms_core.models import RunType, PropertyType, Container
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.experiment_run import ExperimentRunRowHandler, SampleRowHandler
from fms_core.template_importer._constants import LOAD_ALL
from fms_core.templates import EXPERIMENT_RUN_TEMPLATE_SHEET_INFO
from fms_core.template_importer._constants import DESTINATION_CONTAINER_BARCODE_MARKER
from collections import defaultdict
from datetime import datetime
from fms_core.services.step import get_step_from_template
from .._utils import float_to_decimal_and_none, input_to_date_and_none, load_all_or_float_to_decimal_and_none
from fms_core.utils import str_cast_and_normalize, str_cast_and_normalize_lower
EXPERIMENT_PROPERTIES_STARTING_INDEX = 6
SAMPLE_PROPERTIES_STARTING_INDEX = 9
RUN_TYPE_INDEX = 2

class ExperimentRunImporter(GenericImporter):
    SHEETS_INFO = EXPERIMENT_RUN_TEMPLATE_SHEET_INFO

    def __init__(self):
        super().__init__()
        self.experiment_properties_starting_index = EXPERIMENT_PROPERTIES_STARTING_INDEX
        self.sample_properties_starting_index = SAMPLE_PROPERTIES_STARTING_INDEX


    def initialize_data_for_template(self, runtype, process_properties, process_measurement_properties):
        self.preloaded_data = {'run_type': {}, 'protocol': None, 'protocols_dict': {}, 'property_types_by_name': {}}

        # Preload RunType and Protocols dict
        try:
            self.preloaded_data['run_type'] = RunType.objects.get(name=runtype)

            # Preload Protocols objects for this run type in a dictionary for faster access
            self.preloaded_data['protocols_dict'] = self.preloaded_data['run_type'].get_protocols_dict()

        except Exception as e:
            self.base_errors.append(f"No run type with name {runtype} could be found.")

        # Preload PropertyType objects for this experiment type in a dictionary for faster access
        try:
            run_protocols_ids = []
            for protocol_parent, children_protocol in self.preloaded_data['protocols_dict'].items():
                self.preloaded_data['protocol'] = protocol_parent
                run_protocols_ids.append(protocol_parent.id)
                for child_protocol in children_protocol:
                    run_protocols_ids.append(child_protocol.id)
            self.preloaded_data['process_properties'] = {o.name: {'property_type_obj': o} for o in list(PropertyType.objects.filter(name__in=process_properties, object_id__in=run_protocols_ids))}
            self.preloaded_data['process_measurement_properties'] = {o.name: {'property_type_obj': o} for o in list(PropertyType.objects.filter(name__in=process_measurement_properties, object_id__in=run_protocols_ids))}
        except Exception as e:
            self.base_errors.append(f"Property Type could not be found. {e}")

    def validation_by_run_type(self, run_type, sample_input, experiment_input):
        match run_type.name:
            case "Axiom":
                experiment_destination_barcode = defaultdict(set)
                for sample_row in sample_input:
                    experiment_destination_barcode[sample_row["sample"]["experiment_name"]].add(sample_row["barcode"])
                for experiment_row in experiment_input:
                    if (len(experiment_destination_barcode[experiment_row["experiment_run_name"]]) > 1):
                        self.base_errors.append(f"Experiment {experiment_row['experiment_run_name']} receives samples from more than one container {experiment_destination_barcode[experiment_row['experiment_run_name']]}.")
                    elif len(experiment_destination_barcode[experiment_row["experiment_run_name"]]) == 1:
                        source_container_barcode = list(experiment_destination_barcode[experiment_row["experiment_run_name"]])[0]
                        container = Container.objects.filter(barcode=source_container_barcode).first()
                        comment = container.comment
                        start = comment.find(DESTINATION_CONTAINER_BARCODE_MARKER)
                        if start > -1:
                            start = start + len(DESTINATION_CONTAINER_BARCODE_MARKER)
                            end = comment.find(" ", start)
                            destination_barcode = comment[start:end]
                            if destination_barcode != experiment_row["container"]["barcode"]:
                                self.base_errors.append(f"Experiment Name {experiment_row['experiment_run_name']} : Source container {container.name} was set to be transfered to Experiment Container Barcode {destination_barcode}.")
                    

    def import_template_inner(self):
        samples_sheet = self.sheets['Samples']
        experiments_sheet = self.sheets['Experiments']
        samples_df = samples_sheet.dataframe
        experiments_df = experiments_sheet.dataframe
        sample_input = []
        experiment_input = []

        # PRELOADING - Set values for global data
        runtype_name = experiments_df.values[RUN_TYPE_INDEX][1]

        self.initialize_data_for_template(runtype=runtype_name,
                                          process_properties=experiments_df.values[experiments_sheet.header_row_nb][self.experiment_properties_starting_index:].tolist(),
                                          process_measurement_properties=samples_df.values[samples_sheet.header_row_nb][self.sample_properties_starting_index:].tolist())

        # Identify for each row of the matching workflow step
        step_by_row_id, errors, warnings = get_step_from_template(self.preloaded_data['protocol'], self.sheets, self.SHEETS_INFO)
        self.base_errors.extend(errors)

        """
            SAMPLES SHEET
        """
        sample_rows_data = defaultdict(list)
         # Iterate through sample rows
        for i, row_data in enumerate(samples_sheet.rows):
            # Extract process measurement property values
            process_measurement_properties = self.preloaded_data['process_measurement_properties']
            for (key, val) in row_data.items()[self.sample_properties_starting_index:]:
                process_measurement_properties[key]['value'] = val
            # Allows for submission of both numeric lanes (1, 2, 3, ...) and coordinates
            lane_or_experiment_container_coordinates = str_cast_and_normalize(row_data['Experiment Container Coordinates (Lane)'])
            # Convert internally to alphanumerical coordinates
            experiment_container_coordinates = lane_or_experiment_container_coordinates if lane_or_experiment_container_coordinates is None or not lane_or_experiment_container_coordinates.isnumeric() else "A" + lane_or_experiment_container_coordinates.zfill(2)
            sample = {'experiment_name': str_cast_and_normalize(row_data['Experiment Name']),
                      'volume_used': load_all_or_float_to_decimal_and_none(row_data['Source Sample Volume Used (uL)']),
                      'experiment_container_coordinates': experiment_container_coordinates,
                      'comment': str_cast_and_normalize(row_data['Comment']),
                      'workflow':
                          {'step_action': str_cast_and_normalize(row_data['Workflow Action']),
                           'step': step_by_row_id[i]
                          },
                      'process_measurement_properties': process_measurement_properties,
                      }

            sample_kwargs = dict(
                barcode=str_cast_and_normalize(row_data['Source Container Barcode']),
                coordinates=str_cast_and_normalize(row_data['Source Container Coordinates']),
                volume_used=sample['volume_used'],
                platform=self.preloaded_data['run_type'].platform
            )

            (result, sample['sample_obj']) = self.handle_row(
                row_handler_class=SampleRowHandler,
                sheet=samples_sheet,
                row_i=i,
                **sample_kwargs,
            )
            # Set the actual volume_used in case the load all option was used
            sample["volume_used"] = (sample['sample_obj'].volume if sample['sample_obj'] is not None else 0) if sample["volume_used"] == LOAD_ALL else sample["volume_used"]
            sample_rows_data[sample['experiment_name']].append(sample)
            sample_kwargs["sample"] = sample
            sample_input.append(sample_kwargs)

        """
            EXPERIMENTS SHEET
        """
        # Iterate through experiment rows
        for row_id, row in enumerate(experiments_sheet.rows):
            experiment_run_dict = {}
            process_properties = self.preloaded_data['process_properties']
            for i, (key, val) in enumerate(row.items()):
                if i < self.experiment_properties_starting_index:
                    experiment_run_dict[key] = row[key]
                else:
                    process_properties[key]['value'] = val

            experiment_run_kwargs = dict(
                # ExperimentRun attributes data dictionary and related objects
                experiment_run_name=str_cast_and_normalize(experiment_run_dict['Experiment Name']),
                instrument={'name': str_cast_and_normalize(str_remove_parenthesis(experiment_run_dict['Instrument Name']))},
                container={'barcode': str_cast_and_normalize(experiment_run_dict['Experiment Container Barcode']),
                           'kind': str_cast_and_normalize_lower(experiment_run_dict['Experiment Container Kind'])},
                start_date=input_to_date_and_none(experiment_run_dict['Experiment Start Date (YYYY-MM-DD)']),
                comment=str_cast_and_normalize(experiment_run_dict['Comment']),
                # Additional data for this row
                process_properties=process_properties,
                sample_rows_info=sample_rows_data[str_cast_and_normalize(experiment_run_dict['Experiment Name'])],
                # Preloaded data
                run_type_obj=self.preloaded_data['run_type'],
                protocols_dict=self.preloaded_data['protocols_dict'],
                imported_template=self.imported_file
            )

            (result, _) = self.handle_row(
                row_handler_class=ExperimentRunRowHandler,
                sheet=experiments_sheet,
                row_i=row_id,
                **experiment_run_kwargs,
            )

            experiment_input.append(experiment_run_kwargs)
      
        self.validation_by_run_type(self.preloaded_data['run_type'], sample_input, experiment_input)

def str_remove_parenthesis(s: str | None) -> str | None:
    if not s:
        return s
    for index in range(len(s)):
        if s[index] == "(":
            return s[:index].strip()
    return s