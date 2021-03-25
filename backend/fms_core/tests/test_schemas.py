from django.core.exceptions import ValidationError
from django.test import TestCase

from ..schema_validators import JsonSchemaValidator, VOLUME_SCHEMA, EXPERIMENTAL_GROUP_SCHEMA



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

    def test_experimental_group_schema(self):
        validator = JsonSchemaValidator(EXPERIMENTAL_GROUP_SCHEMA)

        for g in VALID_EXPERIMENTAL_GROUPS:
            validator(g)

        for g in INVALID_EXPERIMENTAL_GROUPS:
            with self.assertRaises(ValidationError):
                validator([g])
