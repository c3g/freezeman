from fms_core.models import Protocol, PropertyType
from ._generic import GenericHandler
from ...services import create_experiment_run


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

class ExperimentRunHandler(GenericHandler):
    protocols_dict = {}
    property_types_by_name = {}

    def __init__(self, experiment_type, instrument, container, start_date,
                 samples, properties):

        # Preload Protocols objects for this experiment type in a dictionary for faster access
        protocols_for_experiment_type = PROTOCOLS_BY_EXPERIMENT_TYPE_NAME[experiment_type['workflow']]
        for protocol_name in protocols_for_experiment_type.keys():
            p = Protocol.objects.get(name=protocol_name)
            subprotocol_names = protocols_for_experiment_type[protocol_name]
            subprotocols = []
            for subprotocol_name in subprotocol_names:
               subprotocols.append(Protocol.objects.get(name=subprotocol_name))
            self.protocols_dict[p] = subprotocols.copy()

        # Preload PropertyType objects for this experiment type in a dictionary for faster access
        for i, (property_column, v) in enumerate(properties.items()):
            try:
                self.property_types_by_name[property_column] = PropertyType.objects.get(name=property_column)
            except Exception as e:
                self.errors.append(f"Property Type {property_column} could not be found")


        experiment_creator = create_experiment_run(experiment_type, instrument, container, start_date,
                 samples, properties,
                 self.protocols_dict, self.property_types_objs_dict)

        self.errors = experiment_creator.errors


    def get_result(self):
        super().get_result()