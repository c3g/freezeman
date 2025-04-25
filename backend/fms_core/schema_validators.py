import sys
from django.core.exceptions import ValidationError
from jsonschema import Draft7Validator, FormatChecker


__all__ = [
    "JsonSchemaValidator",
    "VOLUME_SCHEMA",
    "VOLUME_VALIDATOR",
    "EXPERIMENTAL_GROUP_SCHEMA",
    "PROPERTY_VALUE_SCHEMA",
    "PROPERTY_VALUE_VALIDATOR",
    "RUN_PROCESSING_VALIDATOR"
]


class JsonSchemaValidator:
    """ Custom class based validator to validate against Json schema for JSONField """

    def __init__(self, schema, formats=None):
        self.schema = schema
        self.formats = formats
        self.validator = Draft7Validator(self.schema, format_checker=FormatChecker(formats=self.formats))

    def __call__(self, value):
        if not self.validator.is_valid(value):
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
            "update_type": {"type": "string", "enum": ["extraction", "update", "transfer"]},
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


PROPERTY_VALUE_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "fms:property_value",
    "title": "PropertyValue value schema",
    "description": "Schema used to define the value in PropertyValue.",
    "type": ["number", "string", "boolean"],
}

PROPERTY_VALUE_VALIDATOR = JsonSchemaValidator(PROPERTY_VALUE_SCHEMA)

RUN_PROCESSING_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "fms:run_processing",
    "title": "Run processing schema",
    "description": "Schema used to define the values in run processing files.",
    "type": "object",
    "properties": {
        "run": {"type": "string"},
        "lane": {"type": "string", "pattern": str(r"^([1-9][0-9]*|0)$")},
        "run_obj_id": {"type": "number"},
        "metrics_report_url": {"type": "string"},
        "readsets": {
            "type": "object",
            "patternProperties": {
                "^.*$": {
                    "type": "object",
                    "properties": {
                        "project_obj_id": {"type": "string"},
                        "external_project_id": {"type": "string"},
                        "project_name": {"type": "string"},
                        "sample_name": {"type": "string"},
                        "derived_sample_id": {"type": ["null", "number"]},
                    },
                    "required": ["project_obj_id", "sample_name", "external_project_id", "project_name"]
                },
            },
        },
        "run_validation": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "sample": {"type": "string"},
                    "index": {
                        "type": "object",
                        "properties": {
                            "pct_on_index_in_lane": {"type": "number", "minimum": 0, "maximum": 100},
                            "pct_of_the_lane": {"type": "number", "minimum": 0, "maximum": 100},
                            "pct_perfect_barcode": {"type": "number", "minimum": 0, "maximum": 100},
                            "pct_one_mismatch_barcode": {"type": "number", "minimum": 0, "maximum": 100},
                            "pf_clusters": {"type": "integer"},
                            "yield": {"type": "integer"},
                            "mean_quality_score": {"type": "number"},
                            "pct_q30_bases": {"type": "number", "minimum": 0, "maximum": 100},
                        },
                    },
                    "qc": {
                        "type": "object",
                        "properties": {
                            "avg_qual": {"type": ["number", "null"]},
                            "duplicate_rate": {"type": ["number", "null"], "minimum": 0, "maximum": 100},
                            "nb_reads": {"type": "number"},
                        },
                    },
                    "blast": {
                        "type": "object",
                        "properties": {
                            "1st_hit": {"type": ["string", "null"]},
                            "2nd_hit": {"type": ["string", "null"]},
                            "3rd_hit": {"type": ["string", "null"]},
                        },
                    },
                    "alignment": {
                        "type": "object",
                        "properties": {
                            "chimeras": {"type": ["number", "null"]},
                            "average_aligned_insert_size": {"type": ["number", "null"]},
                            "pf_read_alignment_rate": {"type": ["number", "null"], "minimum": 0, "maximum": 100},
                            "inferred_sex": {"type": ["string", "null"]},
                            "adapter_dimers": {"type": ["number", "null"]},
                            "mean_coverage": {"type": ["number", "null"]},
                            "aligned_dup_rate": {"type": ["number", "null"], "minimum": 0, "maximum": 100},
                            "sex_concordance": {"type": ["boolean", "null"]},
                        },
                    },
                },
                "required": ["sample", "index", "qc", "blast", "alignment"]
            },
            "minItems": 1,
        }
    },
    "required": ["run_obj_id", "run", "lane", "metrics_report_url", "readsets", "run_validation"],
}

RUN_PROCESSING_VALIDATOR = JsonSchemaValidator(RUN_PROCESSING_SCHEMA, formats=["date-time"])
