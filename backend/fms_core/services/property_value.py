from django.core.exceptions import ValidationError
from fms_core.models import PropertyValue

def create_process_properties(properties, processes_by_protocol_id):
    property_values = []
    errors = []
    warnings = []

    is_valid, errors_properties, warnings_properties = \
        validate_non_optional_properties(properties)

    if not is_valid:
        errors += errors_properties
        return (None, errors, warnings)

    # Create property values for ExperimentRun
    for value_dict in properties.values():
        property_type = value_dict['property_type_obj']
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

def create_process_measurement_properties(properties, process_measurement):
    property_values = []
    errors = []
    warnings = []

    is_valid, errors_properties, warnings_properties = \
        validate_non_optional_properties(properties)

    if not is_valid:
        errors += errors_properties
        return (None, errors, warnings)

    # Create property values for Process Measurement
    for value_dict in properties.values():
        property_type = value_dict['property_type_obj']
        value = value_dict['value']

        # Validate relation between the property type and the correct protocol
        if property_type.object_id != process_measurement.process.protocol.id:
            errors.append(f'{property_type} is not linked to protocol {process_measurement.process.protocol.id}.')

        if type(value).__name__ in ('datetime', 'time'):
            value = value.isoformat().replace("T00:00:00", "")
        else:
            value = str(value) if value else None

        if value is not None:
            try:
                pv = PropertyValue.objects.create(value=value, property_type=property_type, content_object=process_measurement)
                property_values.append(pv)
            except ValidationError as e:
                errors.append(';'.join(e.messages))

    return (property_values, errors, warnings)

def validate_non_optional_properties(properties):
    is_valid = True
    errors = []
    warnings = []

    for value_dict in properties.values():
        property_type = value_dict['property_type_obj']
        value = value_dict['value']

        # Validate non-optional properties
        if not property_type.is_optional and value is None:
            is_valid = False
            errors.append(f'{property_type} is required.')

    return (is_valid, errors, warnings)