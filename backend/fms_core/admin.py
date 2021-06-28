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
    ExperimentRun,
    Sample,
    SampleKind,
    SampleLineage,
    SampleUpdate,
    ExtractedSample,
    TransferredSample,
    Individual,
    Protocol,
    ImportedFile,
)
from .resources import (
    ContainerResource,
    ContainerMoveResource,
    ContainerRenameResource,
    ExperimentRunResource,
    SampleResource,
    SampleKindResource,
    SampleUpdateResource,
    ExtractionResource,
    TransferResource,
    IndividualResource,
    ProtocolResource,
)
from .template_paths import (
    CONTAINER_CREATION_TEMPLATE,
    CONTAINER_MOVE_TEMPLATE,
    CONTAINER_RENAME_TEMPLATE,
    EXPERIMENT_INFINIUM_TEMPLATE,
    SAMPLE_EXTRACTION_TEMPLATE,
    SAMPLE_SUBMISSION_TEMPLATE,
    SAMPLE_UPDATE_TEMPLATE,
    SAMPLE_TRANSFER_TEMPLATE,
)
from .utils_admin import AggregatedAdmin, CustomImportMixin, ExportVersionAdmin

from .utils import (
    float_to_decimal,
)

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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


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
        (None, {"fields": ("sample_kind", "name", "alias", "individual", "creation_date", "collection_site")}),
        ("Quantity Information", {"fields": ("volume", "concentration", "depleted")}),
        ("Location", {"fields": ("container", "coordinates")}),
        ("Additional Information", {"fields": ("experimental_group", "tissue_source", "phenotype", "comment")}),
        ("Update information", {"fields": ("update_comment",)}),
    )

    def has_delete_permission(self, request, obj=None):
        return not (obj and (obj.parents or obj.children))

    def changelist_view(self, request, extra_context=None):
        return super().changelist_view(request, extra_context={
            **(extra_context or {}),
            "submission_template": SAMPLE_SUBMISSION_TEMPLATE,
        })

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)


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

@admin.register(TransferredSample)
class TransferredSampleAdmin(CustomImportMixin, admin.ModelAdmin):
    resource_class = TransferResource
    actions = None
    list_display_links = None

    def changelist_view(self, request, extra_context=None):
        return super().changelist_view(request, extra_context={
            "title": "Import transferred samples",
            "submission_template": SAMPLE_TRANSFER_TEMPLATE,
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

class ExperimentRunForm(forms.ModelForm):
    class Meta:
        model = ExperimentRun
        exclude = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if kwargs.get("instance"):
            # If we're in edit mode
            return

@admin.register(ExperimentRun)
class ExperimentRunAdmin(CustomImportMixin, admin.ModelAdmin):
    resource_class = ExperimentRunResource
    form = ExperimentRunForm

    list_display = (
        "id",
        "instrument",
        "experiment_type",
        "container"
    )

    list_select_related = (
        "instrument",
        "experiment_type",
        "container",
    )

    list_filter = (
        "instrument__name",
        "experiment_type__workflow",
    )

    search_fields = (
        "container__barcode",
    )

    fieldsets = (
        (None, {"fields": ["start_date", "container", "instrument", "experiment_type"]}),
    )

    def changelist_view(self, request, extra_context=None):
        return super().changelist_view(request, extra_context={
            "title": "Experiment run submission",
            "submission_template": EXPERIMENT_INFINIUM_TEMPLATE,
        })

    def get_queryset(self, request):
        return super().get_queryset(request) # empty

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False



class ProtocolForm(forms.ModelForm):
    class Meta:
        model = Protocol
        exclude = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if kwargs.get("instance"):
            # If we're in edit mode
            return


@admin.register(Protocol)
class ProtocolAdmin(ExportVersionAdmin):
    form = ProtocolForm
    resource_class = ProtocolResource


    list_display = (
        "name",
    )

    search_fields = (
        "name",
    )

    fieldsets = (
        (None, {"fields": ("name",)}),
    )



@admin.register(ImportedFile)
class ImportedFileAdmin(admin.ModelAdmin):
    actions = None
    list_display_links = None

    list_display = [
        "file"
    ]

    # noinspection PyMethodMayBeStatic
    def file(self, obj):
        return format_html('<a href="{}">{}</a>', f"{settings.MEDIA_URL}uploads/{obj.filename}", obj.filename)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
