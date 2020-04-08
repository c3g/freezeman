from django.contrib import admin
from import_export.admin import ImportMixin
from .utils_admin import AggregatedAdmin
from .resources import *

from .models import Container, Sample, ExtractedSample, Individual


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


@admin.register(ExtractedSample)
class ExtractedSampleAdmin(ImportMixin, admin.ModelAdmin):
    resource_class = ExtractionResource
    actions = None
    list_display_links = None

    def changelist_view(self, request, extra_context=None):
        extra_context = {"title": "Import extracted samples"}
        return super().changelist_view(request, extra_context=extra_context)

    def has_add_permission(self, request):
        return False


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
