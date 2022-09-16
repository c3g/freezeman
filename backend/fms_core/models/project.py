import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel
from django.contrib.auth.models import User

from ._constants import STANDARD_NAME_FIELD_LENGTH, PROJECT_STATUS_CHOICES
from ._utils import add_error as _add_error
from ._validators import name_validator, email_validator

__all__ = ["Project"]

@reversion.register()
class Project(TrackedModel):
    name = models.CharField(unique=True, max_length=STANDARD_NAME_FIELD_LENGTH, validators=[name_validator],
                            help_text="The name of the project.")
    principal_investigator = models.CharField(blank=True, max_length=200, help_text="The principal investigator of the project.")
    requestor_name = models.CharField(blank=True, max_length=200, help_text="The name of the requestor of the project.")
    requestor_email = models.CharField(blank=True, max_length=200, validators=[email_validator],
                                       help_text="The email of the requestor of the project.")
    targeted_end_date = models.DateField(blank=True, null=True, help_text="Targeted date to conclude the project.")
    status = models.CharField(choices=((type, type) for type in PROJECT_STATUS_CHOICES), max_length=20, default="Open",
                              help_text="The status of the project.")

    external_id = models.CharField(blank=True, null=True,  max_length=200, help_text="Identifier to connect to an external system.")
    external_name = models.CharField(blank=True, null=True, max_length=200, help_text="Original project name used by external client.")

    comment = models.TextField(blank=True, help_text="Other relevant information about the project.")

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        project_similar_name = Project.objects.filter(name__iexact=self.name).first()
        if project_similar_name and project_similar_name.id != self.id:
            add_error("name", f"Another project with a similar name ({project_similar_name.name}) exists. Two project names cannot be distinguished only by letter case.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Normalize and validate before saving, always!
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object

    def __str__(self):
        return '%d: %s' % (self.id, self.name)

    def __repr__(self):
        return '%d: %s' % (self.id, self.name)