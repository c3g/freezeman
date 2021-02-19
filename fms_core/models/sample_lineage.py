import reversion

from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.db import models

from ._utils import add_error as _add_error


@reversion.register()
class SampleLineage(models.Model):
    parent = models.ForeignKey("Sample", help_text="Parent sample",
                               on_delete=models.CASCADE, related_name="parent_sample")
    child = models.ForeignKey("Sample", help_text="Child sample",
                              on_delete=models.CASCADE, related_name="child_sample")

    def clean(self):
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if self.child.biospecimen_type not in Sample.BIOSPECIMEN_TYPES_NA:
            add_error("biospecimen_type", "Extracted sample need to be a type of Nucleic Acid.")

        if self.parent.biospecimen_type in Sample.BIOSPECIMEN_TYPES_NA:
            add_error("child_of",
                      f"Extraction process cannot be run on sample of type {', '.join(Sample.BIOSPECIMEN_TYPES_NA)}")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object


@receiver(m2m_changed, sender=SampleLineage)
def sample_lineage_added(sender, instance, action, pk_set, **kwargs):
    if action == "pre_add":
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        from .sample import Sample
        if instance.biospecimen_type not in Sample.BIOSPECIMEN_TYPES_NA:
            add_error("biospecimen_type", "Extracted sample need to be a type of Nucleic Acid.")

        parent = Sample.objects.get(id=pk_set.pop())
        if parent.biospecimen_type in Sample.BIOSPECIMEN_TYPES_NA:
            add_error("child_of",
                      f"Extraction process cannot be run on sample of type {', '.join(Sample.BIOSPECIMEN_TYPES_NA)}")

        if errors:
            raise ValidationError(errors)



