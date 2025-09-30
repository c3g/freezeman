from django.db import models

PREFERENCE_OPTION_TYPES = [
    ('str', 'String'),
    ('int', 'Integer'),
    ('bool', 'Boolean'),
    ('float', 'Float'),
]

class PreferenceOption(models.Model):
    name = models.CharField(max_length=100, unique=True)
    type = models.Choices(PREFERENCE_OPTION_TYPES)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Preference Option"
        verbose_name_plural = "Preference Options"

    def __str__(self):
        return f"{self.name} ({self.type}): {self.description}"