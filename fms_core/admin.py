from django.contrib import admin
from .utils_admin import AggregatedAdmin
from .resources import *

from .models import Container, Sample, Individual


# Set site header to the actual name of the application
admin.site.site_header = "FreezeMan"


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

    search_fields = (
        "name",
        "barcode",
    )

    fieldsets = (
        (None, {"fields": ("kind", "name", "barcode")}),
        ("Parent Container", {"fields": ("location", "coordinates")}),
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

    search_fields = (
        "name",
        "alias",
    )

    fieldsets = (
        (None, {"fields": ("biospecimen_type", "name", "alias", "individual", "reception_date", "collection_site")}),
        ("Quantity Information", {"fields": ("volume", "concentration", "depleted")}),
        ("For Extracted Samples Only", {"fields": ("extracted_from", "volume_used")}),
        ("Location", {"fields": ("container", "coordinates")}),
        ("Additional Information", {"fields": ("experimental_group", "tissue_source", "phenotype", "comment")}),
    )

    # def individual_participant_id(self, obj):
    #     return obj.individual.participant_id
    #
    # individual_participant_id.admin_order_field = 'individual__participant_id'
    #
    # def container_barcode(self, obj):
    #     return obj.container.barcode
    #
    # container_barcode.admin_order_field = 'container__barcode'


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

    search_fields = (
        "participant_id",
        "name",
        "pedigree",
        "cohort",
    )
