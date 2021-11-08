import reversion

from django.core.exceptions import ValidationError
from django.db import models

from .tracked_model import TrackedModel

from ._utils import add_error as _add_error

@reversion.register()
class ProtocolBySubprotocol(TrackedModel):
    child = models.ForeignKey("Protocol", help_text="Child protocol",
                              on_delete=models.CASCADE, related_name="child_protocol")
    parent = models.ForeignKey("Protocol", help_text="Parent protocol",
                               on_delete=models.CASCADE, related_name="parent_protocol")

    def clean(self):
        super().clean()
        errors = {}

        def add_error(field: str, error: str):
            _add_error(errors, field, ValidationError(error))

        if ProtocolBySubprotocol.objects.filter(parent=self.child).exists():
            add_error("child", "A child protocol cannot have children.")  
        
        if self.child == self.parent:
            add_error("child", "A protocol cannot have itself as child.")

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)  # Save the object