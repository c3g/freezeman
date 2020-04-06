from django.contrib import admin
from reversion.admin import VersionAdmin

from .models import Container, Sample, Individual


@admin.register(Container)
class ContainerAdmin(VersionAdmin):
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
class SampleAdmin(VersionAdmin):
    list_display = (
        "biospecimen_type",
        "name",
        "alias",
        "individual__name",
        "container__name",
        "container__barcode",
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
class IndividualAdmin(VersionAdmin):
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
