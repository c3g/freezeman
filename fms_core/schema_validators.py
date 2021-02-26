import sys
from django.core.exceptions import ValidationError
from jsonschema import Draft7Validator, FormatChecker


__all__ = [
    "JsonSchemaValidator",
    "VOLUME_SCHEMA",
    "VOLUME_VALIDATOR",
    "EXPERIMENTAL_GROUP_SCHEMA",
]


class JsonSchemaValidator:
    """ Custom class based validator to validate against Json schema for JSONField """

    def __init__(self, schema, formats=None):
        self.schema = schema
        self.formats = formats
        self.validator = Draft7Validator(self.schema, format_checker=FormatChecker(formats=self.formats))

    def __call__(self, value):
        if not self.validator.is_valid(value):
            print(tuple(self.validator.iter_errors(value)), file=sys.stderr)
            raise ValidationError("Not valid JSON schema for this field.")
        return value

    def deconstruct(self):
        return (
            "fms_core.schema_validators.JsonSchemaValidator",
            [self.schema],
            {"formats": self.formats}
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
            "volume_value": {
                "type": "string",
                # Any of 0.0, .0, 0, 0.
                # Don't accept just .
                "pattern": r"^(\d*\.\d+|\d+(\.\d*)?)$"
            },
            "date": {"type": "string", "format": "date-time"},
            "extracted_sample_id": {"type": "integer"},
        },
        "if": {
            "properties": {
                "update_type": {"const": "extraction"},
            },
        },
        "then": {
            "required": ["extracted_sample_id"],
        },
        "else": {
            "not": {"required": ["extracted_sample_id"]},
        },
        "additionalProperties": False,
        "required": ["update_type", "volume_value", "date"]
    },
    "minItems": 1
}

VOLUME_VALIDATOR = JsonSchemaValidator(VOLUME_SCHEMA, formats=["date-time"])


EXPERIMENTAL_GROUP_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "fms:experimental_group",
    "title": "Experimental group schema",
    "description": "Schema used to define experimental groups for a sample.",
    "type": "array",
    "items": {
        "type": "string",
        "minLength": 1,
    },
    "uniqueItems": True
}
