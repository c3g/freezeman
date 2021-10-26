from django.core.exceptions import ValidationError
from fms_core.models import PropertyValue

def create_process_properties(properties, processes_by_protocol_id):
    property_values = []
    errors = []
    warnings = []

    # Create property values for ExperimentRun
    for value_dict in properties.values():
        property_type = value_dict['type_obj']
        value = value_dict['value']
        process = processes_by_protocol_id[property_type.object_id]

        if type(value).__name__ in ('datetime', 'time'):
            value = value.isoformat().replace("T00:00:00", "")
        else:
            value = str(value) if value else ' '

        try:
            pv = PropertyValue.objects.create(value=value, property_type=property_type, content_object=process)
            property_values.append(pv)
        except ValidationError as e:
            errors.append(';'.join(e.messages))

    return (property_values, errors, warnings)