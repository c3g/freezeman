from django.contrib import admin
from reversion.admin import VersionAdmin

from .models import Container, Sample, Individual


@admin.register(Container)
class ContainerAdmin(VersionAdmin):
    pass


@admin.register(Sample)
class SampleAdmin(VersionAdmin):
    pass


@admin.register(Individual)
class IndividualAdmin(VersionAdmin):
    pass
