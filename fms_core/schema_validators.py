from jsonschema import Draft7Validator, FormatChecker
from django.core.exceptions import ValidationError


class JsonSchemaValidator(object):
    """ Custom class based validator to validate against Json schema for JSONField """

    def __init__(self, schema, format_checker=None):
        self.schema = schema
        self.format_checker = format_checker
        self.validator = Draft7Validator(self.schema, format_checker=FormatChecker(formats=self.format_checker))

    def __call__(self, value):
        if not self.validator.is_valid(value):
            raise ValidationError("Not valid JSON schema for this field.")
        return value

    def deconstruct(self):
        return (
            'fms_core.schema_validators.JsonSchemaValidator',
            [self.schema],
            {}
        )


VOLUME_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "fms:volume",
    "title": "Volume schema",
    "description": "Schema used to define volume and its updates.",
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "update_type": {"type": "string", "enum": ["extraction", "update"]},
            "volume_value": {"type": "string"},
            "date": {"type": "string", "format": "date"},
            "extracted_sample_id": {"type": "string"}
        },
        "additionalProperties": False,
        "if": {
            "properties": {
                "update_type": {
                    "const": ["extraction"]}
            },
            "required": ["extracted_sample_id"]
        },
        "required": ["update_type", "volume_value", "date"]
    }
}
