from django.conf import settings
from ._generic import GenericImporter
from fms_core.import_tool.creators import ExperimentRunCreator
from fms_core.models import Protocol, PropertyType
from .._utils import data_row_ids_range, convert_property_value_to_str


PROTOCOLS_BY_EXPERIMENT_TYPE_NAME = {
    'Infinium Global Screening Array-24':
        { 'Illumina Infinium Preparation': [ 'Infinium: Amplification',
                                             'Infinium: Fragmentation',
                                             'Infinium: Precipitation',
                                             'Infinium: Hybridization',
                                             'Infinium: Wash Beadchip',
                                             'Infinium: Extend and Stain',
                                             'Infinium: Scan Preparation'
                                             ]
        }

}


class ExperimentRunImporter(GenericImporter):
    base_errors = []
    protocols_dict = {}
    property_types_by_name = {}
    rows = []

    def __init__(self, file, format):
        self.sheet_names = ['Experiments', 'Samples']
        super().__init__(file, format)

    def import_template(self, dry_run):
        result =  super().import_template(dry_run)
        return result

    def import_template_inner(self):
        experiment_run_dict = {}

        # For the Experiments sheet
        experiments_sheet = self.sheets['Experiments']

        # Getting single cell data for Experiment Type workflow value
        experiment_type = {'workflow': experiments_sheet.values[1][2]}


        # Preload Protocols objects for this experiment type in a dictionary for faster access
        protocols_for_experiment_type = PROTOCOLS_BY_EXPERIMENT_TYPE_NAME[experiment_type['workflow']]
        for protocol_name in protocols_for_experiment_type.keys():
            p = Protocol.objects.get(name=protocol_name)
            subprotocol_names = protocols_for_experiment_type[protocol_name]
            subprotocols = []
            for subprotocol_name in subprotocol_names:
               subprotocols.append(Protocol.objects.get(name=subprotocol_name))
            self.protocols_dict[p] = subprotocols.copy()


        # Experiments rows

        # Setting headers for Experiments sheet Experiments rows
        experiments_row_header = 8
        experiments_sheet.columns = experiments_sheet.values[experiments_row_header]

        # Iterate through experiment rows
        for row_id in data_row_ids_range(experiments_row_header+1, experiments_sheet):
            properties = {}
            row = experiments_sheet.iloc[row_id]
            for i, (key, val) in enumerate(row.items()):
                if i < 6:
                    experiment_run_dict[key] = row[key]
                else:
                    properties[key] = experiments_sheet.iloc[row_id][key]

            container = {'barcode': experiment_run_dict['Experiment Container Barcode'],
                         'kind': experiment_run_dict['Experiment Container Kind']}
            instrument = {'name': experiment_run_dict['Instrument Name']}

            start_date = experiment_run_dict['Experiment Start Date']

            # Preload PropertyType objects for this experiment type in a dictionary for faster access
            for i, (property_column, v) in enumerate(properties.items()):
                try:
                    self.property_types_by_name[property_column] = PropertyType.objects.get(name=property_column)
                except Exception as e:
                    import ipdb; ipdb.sset_trace()
                    self.base_errors.append(f"Property Type {property_column} could not be found")


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


            experiment_run_creator = ExperimentRunCreator(experiment_type=experiment_type,
                                 instrument=instrument,
                                 container=container,
                                 start_date=start_date,
                                 samples=samples,
                                 properties=properties,
                                 protocols_objs_dict=self.protocols_dict,
                                 property_types_objs_dict=self.property_types_by_name,
                                 )
            result = experiment_run_creator.get_result()

            row_list_str = list(map(lambda x: convert_property_value_to_str(x), row.values.flatten().tolist()))

            result['diff'] = row_list_str

            self.rows.append(result)


        return {
            "diff_headers": experiments_sheet.columns.tolist(),
            #"valid": not (result.has_errors() or result.has_validation_errors()),
            "valid": True,
            # "has_warnings": any([r.warnings for r in result.rows]),
            "has_warnings": False,
            # "base_errors": [{
            #     "error": e,
            #     "traceback": 'e.traceback' if settings.DEBUG else "",
            # } for e in self.base_errors],
            "base_errors": [],
            "rows": self.rows,
        }