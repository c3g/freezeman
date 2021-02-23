from django import forms
from django.conf import settings
from django.contrib import admin
from django.templatetags.static import static
from django.utils.html import format_html

from .containers import ContainerSpec, PARENT_CONTAINER_KINDS
from .models import (
    Container,
    ContainerMove,
    ContainerRename,
    Sample,
    SampleKind,
    SampleUpdate,
    ExtractedSample,
    Individual,
    ImportedFile,
)
from .resources import (
    ContainerResource,
    ContainerMoveResource,
    ContainerRenameResource,
    SampleResource,
    SampleKindResource,
    SampleUpdateResource,
    ExtractionResource,
    IndividualResource,
)
from .template_paths import (
    CONTAINER_CREATION_TEMPLATE,
    CONTAINER_MOVE_TEMPLATE,
    CONTAINER_RENAME_TEMPLATE,
    SAMPLE_EXTRACTION_TEMPLATE,
    SAMPLE_SUBMISSION_TEMPLATE,
    SAMPLE_UPDATE_TEMPLATE,
)
from .utils_admin import AggregatedAdmin, CustomImportMixin, ExportVersionAdmin


# Set site header to the actual name of the application
admin.site.site_header = "FreezeMan"


class ContainerForm(forms.ModelForm):
    class Meta:
        model = Container
        exclude = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if kwargs.get("instance"):
            # If we're in edit mode
            self.fields["location"].queryset = Container.objects.filter(
                kind__in=tuple(
                    c.container_kind_id for c in ContainerSpec.container_specs
                    if c.can_hold_kind(self.instance.kind)
                )
            )
            return

        self.fields["location"].queryset = Container.objects.filter(kind__in=PARENT_CONTAINER_KINDS)


@admin.register(Container)
class ContainerAdmin(AggregatedAdmin):
    form = ContainerForm
    resource_class = ContainerResource

    list_display = (
        "barcode",
        "name",
        "kind",
        "location",
        "coordinates"
    )

    list_select_related = (
        "location",
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
        ("Parent container", {
            "fields": ("location", "coordinates"),
            "classes": ("parent_fieldset",),
        }),
        ("Additional information", {"fields": ("comment",)}),
        ("Update information", {"fields": ("update_comment",)}),
    )

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        # glob doesn't work with static
        # all_files = glob.glob(static("submission_templates/Container_creation*.xlsx"))
        extra_context['submission_template'] = CONTAINER_CREATION_TEMPLATE
        return super().changelist_view(request, extra_context=extra_context,)


class VolumeHistoryWidget(forms.widgets.HiddenInput):
    class Media:
        js = (static("fms_core/volume_history_widget.js"),)

    def __init__(self, attrs=None):
        super().__init__({
            **(attrs or {}),
            "data-volume-history": "true",
        })


class SampleForm(forms.ModelForm):
    class Meta:
        model = Sample
        exclude = ()
        widgets = {"volume_history": VolumeHistoryWidget()}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if kwargs.get("instance"):
            self.fields["extracted_from"].queryset = self.fields["extracted_from"].queryset\
                .exclude(id=self.instance.id)

        self.fields["extracted_from"].queryset = self.fields["extracted_from"].queryset\
            .select_related("container", "extracted_from")


@admin.register(Sample)
class SampleAdmin(AggregatedAdmin):
    form = SampleForm
    resource_class = SampleResource

    list_display = (
        "sample_kind",
        "name",
        "alias",
        "individual",
        "container",
        "coordinates",
        "volume",
        "concentration",
        "is_depleted",
    )

    list_select_related = (
        "sample_kind",
        "individual",
        "container",
        "extracted_from",
    )

    list_filter = (
        "sample_kind",
        "depleted",
    )

    search_fields = (
        "name",
        "alias",
        "container__barcode",
    )

    fieldsets = (
        (None, {"fields": ("sample_kind", "name", "alias", "individual", "reception_date", "collection_site")}),
        ("Quantity Information", {"fields": ("volume_history", "concentration", "depleted")}),
        ("For Extracted Samples Only", {"fields": ("extracted_from", "volume_used")}),
        ("Location", {"fields": ("container", "coordinates")}),
        ("Additional Information", {"fields": ("experimental_group", "tissue_source", "phenotype", "comment")}),
        ("Update information", {"fields": ("update_comment",)}),
    )

    def has_delete_permission(self, request, obj=None):
        return not (obj and obj.extracted_from)

    def changelist_view(self, request, extra_context=None):
        return super().changelist_view(request, extra_context={
            **(extra_context or {}),
            "submission_template": SAMPLE_SUBMISSION_TEMPLATE,
        })


@admin.register(ExtractedSample)
class ExtractedSampleAdmin(CustomImportMixin, admin.ModelAdmin):
    resource_class = ExtractionResource
    actions = None
    list_display_links = None

    def changelist_view(self, request, extra_context=None):
        return super().changelist_view(request, extra_context={
            "title": "Import extracted samples",
            "submission_template": SAMPLE_EXTRACTION_TEMPLATE,
        })

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False



class SampleKindForm(forms.ModelForm):
    class Meta:
        model = SampleKind
        exclude = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if kwargs.get("instance"):
            # If we're in edit mode
            return


@admin.register(SampleKind)
class SampleKindAdmin(AggregatedAdmin):
    form = SampleKindForm
    resource_class = SampleKindResource

    list_display = (
        "name",
        "molecule_ontology_curie"
    )

    list_filter = (
        "name",
        "molecule_ontology_curie"
    )

    search_fields = (
        "name",
        "molecule_ontology_curie"
    )

    fieldsets = (
        (None, {"fields": ("name", "molecule_ontology_curie")}),
    )

class IndividualForm(forms.ModelForm):
    class Meta:
        model = Individual
        exclude = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if kwargs.get("instance"):
            parent_queryset = Individual.objects.filter(taxon=self.instance.taxon).exclude(name=self.instance.name)
            self.fields["mother"].queryset = parent_queryset
            self.fields["father"].queryset = parent_queryset


@admin.register(Individual)
class IndividualAdmin(ExportVersionAdmin):
    form = IndividualForm
    resource_class = IndividualResource

    list_display = (
        "name",
        "taxon",
        "sex",
        "pedigree",
        "mother",
        "father",
        "cohort",
    )

    list_select_related = (
        "mother",
        "father",
    )

    list_filter = (
        "taxon",
        "sex",
    )

    search_fields = (
        "name",
        "pedigree",
        "cohort",
    )


@admin.register(ContainerMove)
class ContainerMoveAdmin(CustomImportMixin, admin.ModelAdmin):
    resource_class = ContainerMoveResource
    actions = None
    list_display_links = None

    def changelist_view(self, request, extra_context=None):
        return super().changelist_view(request, extra_context={
            "title": "Move Containers",
            "submission_template": CONTAINER_MOVE_TEMPLATE,
        })

    def get_queryset(self, request):
        # TODO: Return subset of samples which have been moved or something
        return super().get_queryset(request).filter(barcode__isnull=True)  # empty

    def has_add_permission(self, request):
        return False


@admin.register(ContainerRename)
class ContainerRenameAdmin(CustomImportMixin, admin.ModelAdmin):
    resource_class = ContainerRenameResource
    actions = None
    list_display_links = None

    def changelist_view(self, request, extra_context=None):
        return super().changelist_view(request, extra_context={
            "title": "Rename Containers",
            "submission_template": CONTAINER_RENAME_TEMPLATE,
        })

    def get_queryset(self, request):
        return super().get_queryset(request).filter(barcode__isnull=True)  # empty

    def has_add_permission(self, request):
        return False


@admin.register(SampleUpdate)
class SampleUpdateAdmin(CustomImportMixin, admin.ModelAdmin):
    resource_class = SampleUpdateResource
    actions = None
    list_display_links = None

    def changelist_view(self, request, extra_context=None):
        return super().changelist_view(request, extra_context={
            "title": "Update Samples",
            "submission_template": SAMPLE_UPDATE_TEMPLATE,
        })

    def get_queryset(self, request):
        # TODO: Return subset of samples which have updates or something
        return super().get_queryset(request).filter(container__isnull=True)  # empty

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ImportedFile)
class ImportedFileAdmin(admin.ModelAdmin):
    actions = None
    list_display_links = None

    list_display = (
        "file",
        "added",
        "imported_by",
    )

    # noinspection PyMethodMayBeStatic
    def file(self, obj):
        return format_html('<a href="{}">{}</a>', f"{settings.MEDIA_URL}uploads/{obj.filename}", obj.filename)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
