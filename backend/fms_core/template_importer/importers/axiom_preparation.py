from fms_core.models import PropertyType, Protocol
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.axiom_preparation.axiom_batch import AxiomBatchRowHandler
from fms_core.templates import AXIOM_PREPARATION_TEMPLATE
from fms_core.services.step import get_step_from_template
from .._utils import input_to_date_and_none
from fms_core.utils import str_cast_and_normalize

PROPERTIES_STARTING_INDEX = 5

# Some template columns have headers that are not valid names (invalid characters)
# {{TEMPLATE PROPERTY NAME : DB PROPERTY NAME}
TEMPLATE_PROPERTY_MAPPING = {
    "Incubation Time In Amplification (YYYY-MM-DD HH:MM)": "Incubation Time In Amplification",
    "Incubation Time Out Amplification (YYYY-MM-DD HH:MM)": "Incubation Time Out Amplification",
}

class AxiomPreparationImporter(GenericImporter):
    SHEETS_INFO = AXIOM_PREPARATION_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX


    def initialize_data_for_template(self, properties):
        # Get protocol for Library Capture
        protocol = Protocol.objects.get(name='Axiom Sample Preparation')
        self.preloaded_data = {'protocol': protocol, 'protocols_dict': {}, 'process_properties': {}}

        # Protocols dict
        try:
            # Preload Protocols objects for this run type in a dictionary for faster access
            self.preloaded_data['protocols_dict'] = self.preloaded_data['protocol'].get_protocols_dict()

        except Exception as e:
            self.base_errors.append(f"No protocol with name {protocol.name} could be found.")

        # Preload PropertyType objects
        try:
            protocols_ids = []
            for protocol_parent, children_protocol in self.preloaded_data['protocols_dict'].items():
                self.preloaded_data['protocol'] = protocol_parent
                protocols_ids.append(protocol_parent.id)
                for child_protocol in children_protocol:
                    protocols_ids.append(child_protocol.id)
            self.preloaded_data['process_properties'] = {o.name: {'property_type_obj': o} for o in list(PropertyType.objects.filter(name__in=properties, object_id__in=protocols_ids))}
        except Exception as e:
            self.base_errors.append(f"Property Type could not be found. {e}")

    def import_template_inner(self):
        batch_sheet = self.sheets['Axiom Batch']
        batch_df = batch_sheet.dataframe
        properties = batch_df.values[batch_sheet.header_row_nb][self.properties_starting_index:].tolist()
        # Replace in the list of property types that are modified in the Template header definition
        properties = [TEMPLATE_PROPERTY_MAPPING[column_name] if column_name in TEMPLATE_PROPERTY_MAPPING.keys() else column_name for column_name in properties]
        self.initialize_data_for_template(properties=properties)

        # Identify for each row of the matching workflow step
        step_by_row_id, errors, warnings = get_step_from_template(self.preloaded_data['protocol'], self.sheets, self.SHEETS_INFO, True)
        self.base_errors.extend(errors)

        """
            AXIOM BATCH SHEET
        """
        # Iterate through experiment rows
        for row_id, row in enumerate(batch_sheet.rows):
            sample_preparation_dict = {}
            process_properties = self.preloaded_data['process_properties']
            for i, (key, val) in enumerate(row.items()):
                if i < self.properties_starting_index:
                    sample_preparation_dict[key] = row[key]
                else:
                    # Convert problematic header names
                    combined_key = TEMPLATE_PROPERTY_MAPPING[key] if key in TEMPLATE_PROPERTY_MAPPING.keys() else key
                    process_properties[combined_key]['value'] = val

            axiom_preparation_kwargs = dict(
                template_data={
                    "container": {'barcode': str_cast_and_normalize(sample_preparation_dict['Container Barcode']),
                              'name': str_cast_and_normalize(sample_preparation_dict['Container Name'])},
                    "start_date": input_to_date_and_none(sample_preparation_dict['Preparation Start Date (YYYY-MM-DD)']),
                    "comment": str_cast_and_normalize(sample_preparation_dict['Comment']),
                    "workflow": {'step_action': str_cast_and_normalize(sample_preparation_dict['Workflow Action'])},
                    # Additional data for this row
                    "process_properties": process_properties,
                    
                },
                additional_data={
                    'step': step_by_row_id[row_id],
                    "protocols_dict": self.preloaded_data['protocols_dict'],
                    "imported_template": self.imported_file
                    
                }
            )

            (result, _) = self.handle_row(
                row_handler_class=AxiomBatchRowHandler,
                sheet=batch_sheet,
                row_i=row_id,
                **axiom_preparation_kwargs,
            )