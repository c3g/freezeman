from django.db import models
from django.core.exceptions import ValidationError

PREFERENCE_OPTION_TYPES = [
    ('str', 'String'),
    ('int', 'Integer'),
    ('bool', 'Boolean'),
    ('float', 'Float'),
]

class PreferenceSetting(models.Model):
    option = models.ForeignKey('PreferenceOption', on_delete=models.PROTECT)
    value = models.CharField(max_length=100)
    user = models.ForeignKey('FreezemanUser', on_delete=models.PROTECT, related_name='preference_settings', null=True, blank=True)

    def save(self, *args, **kwargs):
        try:
            if self.option.type == 'int':
                int(self.value)
            elif self.option.type == 'float':
                float(self.value)
            elif self.option.type == 'bool':
                if self.value.lower() not in ['true', 'false']:
                    raise ValueError("Invalid boolean value")
                else:
                    self.value = self.value.lower()
        except ValueError:
            raise ValidationError(f"Value '{self.value}' is not valid for type '{self.option.type}' for option '{self.option.name}'")
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['option', 'user'], name='preference_setting_option_user_key')
        ]
        verbose_name = "Preference Setting"
        verbose_name_plural = "Preference Settings"

    def __str__(self):
        user_str = self.user.username if self.user else "Default"
        return f"{user_str} - {self.option.name}: {self.value}"