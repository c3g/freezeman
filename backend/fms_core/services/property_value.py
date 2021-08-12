from fms_core.models import PropertyValue

def create_properties_from_values_and_types(properties, property_types_objs_dict, processes_by_protocol_id):
    property_values = []
    errors = []

    # Create property values for ExperimentRun
    for i, (property, value) in enumerate(properties.items()):
        property_type = property_types_objs_dict[property]
        protocol_id = property_type.object_id
        process = processes_by_protocol_id[protocol_id]

        if type(value).__name__ in ('datetime', 'time'):
            value = value.isoformat().replace("T00:00:00", "")

        try:
            pv = PropertyValue.objects.create(value=str(value), property_type=property_type, content_object=process)
            property_values.append(pv)
        except Exception as e:
            errors.append(e.error_dict['value'])

    return (property_values, errors)