from django.contrib import admin
from reversion.admin import VersionAdmin

from .models import Container, Sample, Individual


@admin.register(Container)
class ContainerAdmin(VersionAdmin):
    list_display = (
        "barcode",
        "name",
        "kind",
        "location_barcode",
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
        "container_barcode__name",
        "container_barcode__barcode",
        "location_coordinates",
        "volume",
        "concentration",
        "is_depleted",
    )

    list_filter = (
        "biospecimen_type",
        "depletion",
    )


@admin.register(Individual)
class IndividualAdmin(VersionAdmin):
    list_display = (
        "participant_id",
        "name",
        "taxon",
        "sex",
        "pedigree",
        "mother_id",
        "father_id",
        "cohort",
    )

    list_filter = (
        "taxon",
        "sex",
    )
