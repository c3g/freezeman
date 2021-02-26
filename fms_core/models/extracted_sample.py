from django.db import models
from .sample import Sample


__all__ = ["ExtractedSample"]


class ExtractedSampleManager(models.Manager):
    # noinspection PyMethodMayBeStatic
    def get_queryset(self):
        return Sample.objects.filter(extracted_from__isnull=False)


class ExtractedSample(Sample):
    class Meta:
        proxy = True

    objects = ExtractedSampleManager()
