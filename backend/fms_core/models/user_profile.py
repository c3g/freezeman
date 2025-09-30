from django.db import models
from django.conf import settings

from fms_core.schema_validators import JsonSchemaValidator
from fms_core.models.freezeman_user import FreezemanUser

PREFERENCES_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "fms:preference",
    "title": "Preference schema",
    "description": "Schema used to define user's preferences.",
    "type": "object",
    "properties": {
        "table.sample.page-limit": {"type": "number"}
    }
}

class UserProfile(models.Model):
    user = models.ForeignKey(FreezemanUser, on_delete=models.PROTECT, related_name="user_profile")
    preferences = models.JSONField(
        default={
            "table.sample.page-limit": 100
        },
        validators=[JsonSchemaValidator(PREFERENCES_SCHEMA)]
    )

    def __str__(self):
        return "UserProfile{username=%}" % str(self.user)