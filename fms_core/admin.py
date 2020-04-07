from django.contrib import admin
from .utils_admin import AggregatedAdmin
from .resources import *

from .models import Container, Sample, Individual


@admin.register(Container)
class ContainerAdmin(AggregatedAdmin):
    resource_class = ContainerResource
    list_display = (
        "barcode",
        "name",
        "kind",
        "location",
        "coordinates"
    )

    list_filter = (
        "kind",
    )


@admin.register(Sample)
class SampleAdmin(AggregatedAdmin):
    resource_class = SampleResource
    list_display = (
        "biospecimen_type",
        "name",
        "alias",
        # "individual__name",
        # "container__name",
        # "container__barcode",
        "individual",
        "container",
        "coordinates",
        "volume",
        "concentration",
        "is_depleted",
    )

    list_filter = (
        "biospecimen_type",
        "depleted",
    )


@admin.register(Individual)
class IndividualAdmin(AggregatedAdmin):
    resource_class = IndividualResource
    list_display = (
        "participant_id",
        "name",
        "taxon",
        "sex",
        "pedigree",
        "mother",
        "father",
        "cohort",
    )

    list_filter = (
        "taxon",
        "sex",
    )
