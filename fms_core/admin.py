from django.contrib import admin
from reversion.admin import VersionAdmin

from .models import Container, Sample, Extraction, Individual


@admin.register(Container)
class ContainerAdmin(VersionAdmin):
    pass


@admin.register(Sample)
class SampleAdmin(VersionAdmin):
    pass


@admin.register(Extraction)
class ExtractionAdmin(VersionAdmin):
    pass


@admin.register(Individual)
class IndividualAdmin(VersionAdmin):
    pass
