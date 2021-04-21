import reversion

from datetime import datetime
from django.core.exceptions import ValidationError
from import_export.fields import Field
from import_export.widgets import DateWidget, DecimalWidget, JSONWidget, ForeignKeyWidget, ManyToManyWidget
from ._generic import GenericResource
from ._utils import skip_rows, add_columns_to_preview
from ..containers import (
    CONTAINER_SPEC_TUBE,
    CONTAINER_SPEC_TUBE_RACK_8X12,
)
from ..models import Container, Process, ProcessSample, Protocol, Sample, SampleKind, SampleLineage
from ..utils import (
    blank_str_to_none,
    check_truth_like,
    float_to_decimal,
    get_normalized_str,
)


class ExtractionResource(GenericResource):
    sample_kind = Field(attribute="sample_kind_name", column_name='Extraction Type')
    volume_used = Field(column_name='Volume Used (uL)', widget=DecimalWidget())
    # parent sample container
    sample_container = Field(column_name='Container Barcode')
    sample_container_coordinates = Field(column_name='Location Coord')
    # Computed fields
    container = Field(attribute='container', column_name='Nucleic Acid Container Barcode',
                      widget=ForeignKeyWidget(Container, field='barcode'))
    # Non-attribute fields
    location = Field(attribute='location', column_name='Nucleic Acid Location Barcode',
                     widget=ForeignKeyWidget(Container, field='barcode'))
    location_coordinates = Field(attribute='context_sensitive_coordinates', column_name='Nucleic Acid Location Coord')
    volume = Field(attribute='volume', column_name='Volume (uL)', widget=DecimalWidget())
    concentration = Field(attribute='concentration', column_name='Conc. (ng/uL)', widget=DecimalWidget())
    source_depleted = Field(attribute='source_depleted', column_name='Source Depleted')
    creation_date = Field(attribute='creation_date', column_name='Extraction Date', widget=DateWidget())
    comment = Field(column_name='Comment')

    class Meta:
        model = Sample
        import_id_fields = ()
        fields = (
            'sample_kind',
            'concentration',
            'source_depleted',
            'volume'
        )
        excluded = (
            'container',
            'individual',
            'child_of',
            'comment',
        )
        export_order = (
            'sample_kind',
            'sample_container',
            'sample_container_coordinates',
            'container',
            'location',
            'location_coordinates',
            'concentration',
            'source_depleted',
            'creation_date',
            'comment',
        )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 7)  # Skip preamble

    def import_obj(self, obj, data, dry_run):
        errors = {}
        self.extracted_from = {}

        # This section fetch the source sample that is to be transfered
        try:
            self.extracted_from = Sample.objects.get(
                container__barcode=get_normalized_str(data, "Container Barcode"),
                coordinates=get_normalized_str(data, "Location Coord"),
            )
            # Cast the "Source Depleted" cell to a Python Boolean value and
            # update the original sample if needed. This is the act of the
            # extracted sample depleting the original in the process of its
            # creation.
            self.extracted_from.depleted = (self.extracted_from.depleted or
                                            check_truth_like(get_normalized_str(data, "Source Depleted")))
        except Sample.DoesNotExist as e:
            errors["source sample"] = ValidationError([f"Source Container Barcode and Source Location Coord do not exist or do not contain a sample."], code="invalid")
        
        if self.extracted_from:
            obj.name = self.extracted_from.name
            obj.alias = self.extracted_from.alias
            obj.collection_site = self.extracted_from.collection_site
            obj.experimental_group = self.extracted_from.experimental_group
            obj.individual = self.extracted_from.individual
            obj.tissue_source = Sample.BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE.get(self.extracted_from.sample_kind.name, "")
        else:
            self.manuallyExclude.extend(["name", "collection_site", "individual", "tissue_source"]) 

        # This section creates the containers (Tube and Rack) if needed 

        # Per Alex: We can make new tube racks (8x12) automatically if
        # needed for extractions, using the inputted barcode for the new
        # object.

        shared_parent_info = dict(
            barcode=get_normalized_str(data, "Nucleic Acid Location Barcode"),
            # TODO: Currently can only extract into tube racks 8x12
            #  - otherwise this logic will fall apart
            kind=CONTAINER_SPEC_TUBE_RACK_8X12.container_kind_id
        )
        if shared_parent_info["barcode"]:
            try:
                parent = Container.objects.get(**shared_parent_info)
            except Container.DoesNotExist:
                parent = Container.objects.create(
                    **shared_parent_info,
                    # Below is creation-specific data
                    # Leave coordinates blank if creating
                    # Per Alex: Container name = container barcode if we
                    #           auto-generate the container
                    name=shared_parent_info["barcode"],
                    comment=f"Automatically generated via extraction template import on "
                            f"{datetime.utcnow().isoformat()}Z"
                )
        else:
            parent = None
            self.row_warnings.append(f"Parent rack container will not be created if you do not provide [Nucleic Acid Location Barcode].")

        # Per Alex: We can make new tubes if needed for extractions

        # Information that can be used to either retrieve or create a new
        # tube container. It is of type tube specifically because, as
        # mentioned above, extractions currently only occur into 8x12 tube
        # racks.
        shared_container_info = dict(
            barcode=get_normalized_str(data, "Nucleic Acid Container Barcode"),
            # TODO: Currently can only extract into tubes
            #  - otherwise this logic will fall apart
            kind=CONTAINER_SPEC_TUBE.container_kind_id,
            location=parent,
            coordinates=get_normalized_str(data, "Nucleic Acid Location Coord"),
        )

        try:
            obj.container = Container.objects.get(**shared_container_info)
        except Container.DoesNotExist:
            try:
                obj.container = Container.objects.create(
                    **shared_container_info,
                    # Below is creation-specific data
                    # Per Alex: Container name = container barcode if we
                    #           auto-generate the container
                    name=shared_container_info["barcode"],
                    comment=f"Automatically generated via extraction template import on "
                            f"{datetime.utcnow().isoformat()}Z"
                )
            except Exception as e:
                errors["container"] = ValidationError([f"Could not create destination container. " + e.messages.pop()], code="invalid")
                
        try:
            super().import_obj(obj, data, dry_run)
        except ValidationError as e:
            errors.update(e.update_error_dict(errors).copy())

        try:
            # Create a process for the current extraction
            self.process = Process.objects.create(protocol=Protocol.objects.get(name="Extraction"),
                                                  comment="Extracted samples (imported from template)")
        
            self.process_sample = ProcessSample.objects.create(process=self.process,
                                                               source_sample=self.extracted_from,
                                                               execution_date=obj.creation_date,
                                                               volume_used=self.volume_used,
                                                               comment=self.comment)
        except Exception as e:
            errors["process"] = ValidationError([f"Cannot create process. Fix other errors to resolve this."], code="invalid")

            if errors:
                raise ValidationError(errors)

    def import_field(self, field, obj, data, is_m2m=False):
        # More!! ugly hacks

        if field.attribute in ('source_depleted', 'context_sensitive_coordinates', 'child_of'):
            # Computed field, skip importing it.
            return

        if field.attribute == "sample_kind_name":
            obj.sample_kind = SampleKind.objects.get(name=data["Extraction Type"])

        if field.attribute == 'volume':
            vol = blank_str_to_none(data.get("Volume (uL)"))  # "" -> None for CSVs
            obj.volume = float_to_decimal(vol) if vol is not None else None
            return

        if field.attribute == "concentration":
            conc = blank_str_to_none(data.get("Conc. (ng/uL)"))  # "" -> None for CSVs
            data["Conc. (ng/uL)"] = float_to_decimal(conc) if conc is not None else None

        if field.column_name == "Volume Used (uL)":
            # Normalize volume used
            vu = blank_str_to_none(data.get("Volume Used (uL)"))  # "" -> None for CSVs
            data["Volume Used (uL)"] = float_to_decimal(vu) if vu is not None else None
            self.volume_used = data["Volume Used (uL)"]
            if self.extracted_from:
                self.extracted_from.volume -= self.volume_used

        if field.column_name == "Comment":
            # Normalize extraction comment
            data["Comment"] = get_normalized_str(data, "Comment")
            self.comment = data["Comment"]

        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, instance, using_transactions, dry_run):
        # Update depletion status of original sample
        self.extracted_from.save()

        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Imported extracted samples from template.")

    def save_m2m(self, obj, data, using_transactions, dry_run):
        lineage = SampleLineage.objects.create(parent=self.extracted_from, child=obj, process_sample=self.process_sample)
        super().save_m2m(obj, data, using_transactions, dry_run)

    def import_data(self, dataset, dry_run=False, raise_errors=False, use_transactions=None, collect_failed_rows=False, **kwargs):
        results = super().import_data(dataset, dry_run, raise_errors, use_transactions, collect_failed_rows, **kwargs)
        # This is a section meant to simplify the preview offered to the user before confirmation after a dry run
        # if dry_run and not len(results.invalid_rows) > 0:
        #     missing_columns = ['Volume Used (uL)', 'Container Barcode', 'Location Coord', 'Comment']
        #     results = add_columns_to_preview(results, dataset, missing_columns)

        return results