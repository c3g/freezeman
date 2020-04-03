from django.contrib import admin
from .models import *


@admin.register(Container)
class ContainerAdmin(admin.ModelAdmin):
    pass


@admin.register(Sample)
class SampleAdmin(admin.ModelAdmin):
    pass


@admin.register(Extraction)
class ExtractionAdmin(admin.ModelAdmin):
    pass


@admin.register(Individual)
class IndividualAdmin(admin.ModelAdmin):
    pass
