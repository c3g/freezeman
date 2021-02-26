from django.core.exceptions import ValidationError
from django.test import TestCase

from ..schema_validators import JsonSchemaValidator, VOLUME_SCHEMA, EXPERIMENTAL_GROUP_SCHEMA
from ..utils import VolumeHistoryUpdateType, create_volume_history


VALID_VOLUMES = (
    create_volume_history(VolumeHistoryUpdateType.UPDATE, "0.000"),
    create_volume_history(VolumeHistoryUpdateType.EXTRACTION, "3.000", 1),
)

INVALID_VOLUMES = (
    {},
    {
        "update_type": "update",
    },
    {
        "update_type": "update",
        "volume_value": "5.000",
    },
    {
        "update_type": "update",
        "volume_value": "5.000",
        "date": "2020-04-23T17:37:30.449Z",
        "extracted_sample_id": 1,
    },
    {
        "update_type": "invalid",
        "volume_value": "0.000",
        "date": "2020-04-23T17:37:30.449Z",
    },
    {
        "update_type": "extraction",
        "volume_value": "0.000",
        "date": "2020-04-23T17:37:30.449Z",
    },
    {
        "update_type": "update",
        "volume_value": "",
        "date": "2020-04-23T17:37:30.449Z",
    },
    {
        "update_type": "extraction",
        "volume_value": "3.000",
        "date": "not-a-date",
        "extracted_sample_id": 1,
    },
    {
        "update_type": "update",
        "volume_value": "-3.000",
        "date": "2020-04-23T17:37:30.449Z",
    },
)

VALID_EXPERIMENTAL_GROUPS = (
    ["group1"],
    ["group1", "group2"],
)

INVALID_EXPERIMENTAL_GROUPS = (
    [],
    [""],
    {},
    {"hello": "world"},
)


class AdminUtilsTestCase(TestCase):
    def setUp(self) -> None:
        pass

    def test_volume_schema(self):
        validator = JsonSchemaValidator(VOLUME_SCHEMA, formats=["date-time"])

        for v in VALID_VOLUMES:
            validator([v])

        for v in INVALID_VOLUMES:
            with self.assertRaises(ValidationError):
                validator([v])

    def test_experimental_group_schema(self):
        validator = JsonSchemaValidator(EXPERIMENTAL_GROUP_SCHEMA)

        for g in VALID_EXPERIMENTAL_GROUPS:
            validator(g)

        for g in INVALID_EXPERIMENTAL_GROUPS:
            with self.assertRaises(ValidationError):
                validator([g])
