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
from ..models import Container, Process, ProcessMeasurement, Protocol, Sample, SampleKind, SampleLineage
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
    sample_container = Field(column_name='Source Container Barcode')
    sample_container_coordinates = Field(column_name='Source Container Coord')
    # Computed fields
    destination_container = Field(attribute='container', column_name='Destination Container Barcode',
                                  widget=ForeignKeyWidget(Container, field='barcode'))
    destination_container_coord = Field(attribute='coordinates', column_name='Destination Container Coord')
    destination_container_name = Field(column_name='Destination Container Name')
    destination_container_kind = Field(column_name='Destination Container Kind')
    # Non-attribute fields
    destination_parent_container = Field(column_name='Destination Parent Container Barcode', widget=ForeignKeyWidget(Container, field='barcode'))
    destination_parent_container_coordinates = Field(column_name='Destination Parent Container Coord')
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
            'destination_container',
            'individual',
            'child_of',
            'comment',
        )
        export_order = (  # Export order regulate the column order of the diff output as well as cleaning order during validation.
            'sample_kind',
            'volume_used',
            'sample_container',
            'sample_container_coordinates',
            'destination_container',
            'destination_container_coord',
            'destination_container_name',
            'destination_container_kind',
            'destination_parent_container',
            'destination_parent_container_coordinates',
            'volume',
            'concentration',
            'source_depleted',
            'creation_date',
            'comment',
        )

    def __init__(self):
        super().__init__()
        self.process = None

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 7)  # Skip preamble

    def import_obj(self, obj, data, dry_run):
        errors = {}
        self.extracted_from = {}

        # This section fetch the source sample that is to be transfered
        try:
            self.extracted_from = Sample.objects.get(
                container__barcode=get_normalized_str(data, "Source Container Barcode"),
                coordinates=get_normalized_str(data, "Source Container Coord"),
            )
            # Cast the "Source Depleted" cell to a Python Boolean value and
            # update the original sample if needed. This is the act of the
            # extracted sample depleting the original in the process of its
            # creation.
            self.extracted_from.depleted = (self.extracted_from.depleted or
                                            check_truth_like(get_normalized_str(data, "Source Depleted")))
        except Sample.DoesNotExist as e:
            errors["source sample"] = ValidationError([f"Source Container Barcode and Source Container Coord do not exist or do not contain a sample."], code="invalid")
        
        if self.extracted_from:
            obj.name = self.extracted_from.name
            obj.alias = self.extracted_from.alias
            obj.collection_site = self.extracted_from.collection_site
            obj.experimental_group = self.extracted_from.experimental_group
            obj.individual = self.extracted_from.individual
            obj.tissue_source = Sample.BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE.get(self.extracted_from.sample_kind.name, "")
        else:
            self.fields_manually_excluded.extend(["name", "collection_site", "individual", "tissue_source"])

        # This section creates the containers if needed 
        parent = None
        destination_parent_container_barcode = get_normalized_str(data, "Destination Parent Container Barcode")
        if destination_parent_container_barcode:
            try:
                parent = Container.objects.get(barcode=destination_parent_container_barcode)
            except Container.DoesNotExist:
                errors["destination parent container"] = ValidationError(["The destination parent container does not exist."], code="invalid")

        shared_container_info = dict(barcode=get_normalized_str(data, "Destination Container Barcode"))
        if parent:
            shared_container_info['location'] = parent
        if get_normalized_str(data, "Destination Container Name"):
            shared_container_info['name'] = get_normalized_str(data, "Destination Container Name")
        if get_normalized_str(data, "Destination Container Kind"):
            shared_container_info['kind'] = get_normalized_str(data, "Destination Container Kind")
        if get_normalized_str(data, "Destination Parent Container Coord"):
            shared_container_info['coordinates'] = get_normalized_str(data, "Destination Parent Container Coord")
        try:
            obj.container, _ = Container.objects.get_or_create(
                **shared_container_info,
                defaults={'comment': f"Automatically generated via extraction template import on "
                        f"{datetime.utcnow().isoformat()}Z"},
            )
        except Exception as e:
            errors["container"] = ValidationError([f"Could not create destination container. Destination Container Barcode already exists and related fields do not match: "
                                                   f"[Destination Container Name, Destination Container Kind, Destination Parent Container Barcode, Destination Parent Container Coord] "], code="invalid")

        try:
            super().import_obj(obj, data, dry_run)
        except ValidationError as e:
            errors.update(e.update_error_dict(errors).copy())

        try:
            if not self.process:
                # Create a process for the current extraction
                self.process = Process.objects.create(protocol=Protocol.objects.get(name="Extraction"),
                                                      comment="Extracted samples (imported from template)")

            self.process_measurement = ProcessMeasurement.objects.create(process=self.process,
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

        if field.attribute in ('source_depleted', 'container', 'child_of'):
            # Computed field, skip importing it.
            return

        if field.attribute == 'coordinates':
            obj.coordinates = get_normalized_str(data, "Destination Container Coord")
            return

        if field.attribute == "sample_kind_name":
            obj.sample_kind = SampleKind.objects.get(name=data["Extraction Type"])
            return

        if field.attribute == 'volume':
            vol = blank_str_to_none(data.get("Volume (uL)"))  # "" -> None for CSVs
            obj.volume = float_to_decimal(vol) if vol is not None else None
            return

        if field.attribute == "concentration":
            conc = blank_str_to_none(data.get("Conc. (ng/uL)"))  # "" -> None for CSVs
            obj.concentration = float_to_decimal(conc) if conc is not None else None
            return

        if field.column_name == "Volume Used (uL)":
            # Normalize volume used
            vu = blank_str_to_none(data.get("Volume Used (uL)"))  # "" -> None for CSVs
            data["Volume Used (uL)"] = float_to_decimal(vu) if vu is not None else None
            self.volume_used = data["Volume Used (uL)"]
            return

        if field.column_name == "Comment":
            # Normalize extraction comment
            data["Comment"] = get_normalized_str(data, "Comment")
            self.comment = data["Comment"]
            return

        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, instance, using_transactions, dry_run):
        # Update volume and depletion status of original sample
        if self.extracted_from:
            self.extracted_from.volume -= self.volume_used
            self.extracted_from.save()

        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Imported extracted samples from template.")

    def save_m2m(self, obj, data, using_transactions, dry_run):
        lineage = SampleLineage.objects.create(parent=self.extracted_from, child=obj, process_measurement=self.process_measurement)
        super().save_m2m(obj, data, using_transactions, dry_run)

    def import_data(self, dataset, dry_run=False, raise_errors=False, use_transactions=None, collect_failed_rows=False, **kwargs):
        results = super().import_data(dataset, dry_run, raise_errors, use_transactions, collect_failed_rows, **kwargs)
        # This is a section meant to simplify the preview offered to the user before confirmation after a dry run
        if dry_run and not len(results.invalid_rows) > 0:
            missing_columns = [ 'Extraction Type',
                                'Volume Used (uL)',
                                'Source Container Barcode',
                                'Source Container Coord',
                                'Destination Container Coord',
                                'Destination Container Name',
                                'Destination Container Kind',
                                'Destination Parent Container Barcode',
                                'Destination Parent Container Coord',
                                'Comment']
            results = add_columns_to_preview(results, dataset, missing_columns)
        return results