import reversion

from datetime import datetime
from import_export.fields import Field
from import_export.widgets import DateWidget, DecimalWidget, JSONWidget, ForeignKeyWidget
from ._generic import GenericResource
from ._utils import skip_rows
from ..containers import (
    CONTAINER_SPEC_TUBE,
    CONTAINER_SPEC_TUBE_RACK_8X12,
)
from ..models import Container, Sample, SampleKind
from ..utils import (
    VolumeHistoryUpdateType,
    blank_str_to_none,
    check_truth_like,
    create_volume_history,
    float_to_decimal,
    get_normalized_str,
)


class ExtractionResource(GenericResource):
    sample_kind = Field(attribute="sample_kind_name", column_name='Extraction Type')
    volume_used = Field(attribute='volume_used', column_name='Volume Used (uL)', widget=DecimalWidget())
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
    volume_history = Field(attribute='volume_history', widget=JSONWidget())
    concentration = Field(attribute='concentration', column_name='Conc. (ng/uL)', widget=DecimalWidget())
    source_depleted = Field(attribute='source_depleted', column_name='Source Depleted')
    # individual = Field(attribute='individual', widget=ForeignKeyWidget(Individual, field='name'))
    extracted_from = Field(attribute='extracted_from', widget=ForeignKeyWidget(Sample, field='name'))
    creation_date = Field(attribute='creation_date', column_name='Extraction Date', widget=DateWidget())
    comment = Field(attribute='comment', column_name='Comment')

    class Meta:
        model = Sample
        import_id_fields = ()
        fields = (
            'sample_kind',
            'volume_used',
            'concentration',
            'source_depleted',
            'comment',
        )
        excluded = (
            'container',
            'individual',
            'extracted_from',
            'volume_history',
        )
        export_order = (
            'sample_kind',
            'volume_used',
            'sample_container',
            'sample_container_coordinates',
            'container',
            'location',
            'location_coordinates',
            'volume_history',
            'concentration',
            'source_depleted',
            'creation_date',
            'comment',
        )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 7)  # Skip preamble

    def import_field(self, field, obj, data, is_m2m=False):
        # More!! ugly hacks

        if field.attribute in ('source_depleted', 'context_sensitive_coordinates'):
            # Computed field, skip importing it.
            return

        if field.attribute == "sample_kind_name":
            obj.sample_kind = SampleKind.objects.get(name=data["Extraction Type"])

        if field.attribute == 'volume_history':
            # We store volume as a JSON object of historical values, so this
            # needs to be initialized in a custom way. In this case we are
            # initializing the volume history of the EXTRACTED sample, so the
            # actual history entry is of the "normal" type (UPDATE).
            vol = blank_str_to_none(data.get("Volume (uL)"))  # "" -> None for CSVs
            obj.volume_history = [create_volume_history(
                VolumeHistoryUpdateType.UPDATE,
                str(float_to_decimal(vol)) if vol is not None else ""
            )]
            return

        if field.attribute == 'extracted_from':
            obj.extracted_from = Sample.objects.get(
                container__barcode=get_normalized_str(data, "Container Barcode"),
                coordinates=get_normalized_str(data, "Location Coord"),
            )
            # Cast the "Source Depleted" cell to a Python Boolean value and
            # update the original sample if needed. This is the act of the
            # extracted sample depleting the original in the process of its
            # creation.
            obj.extracted_from.depleted = (obj.extracted_from.depleted or
                                           check_truth_like(get_normalized_str(data, "Source Depleted")))
            return

        if field.attribute == 'container':
            # Per Alex: We can make new tube racks (8x12) automatically if
            # needed for extractions, using the inputted barcode for the new
            # object.

            shared_parent_info = dict(
                barcode=get_normalized_str(data, "Nucleic Acid Location Barcode"),
                # TODO: Currently can only extract into tube racks 8x12
                #  - otherwise this logic will fall apart
                kind=CONTAINER_SPEC_TUBE_RACK_8X12.container_kind_id
            )

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
                obj.container = Container.objects.create(
                    **shared_container_info,
                    # Below is creation-specific data
                    # Per Alex: Container name = container barcode if we
                    #           auto-generate the container
                    name=shared_container_info["barcode"],
                    comment=f"Automatically generated via extraction template import on "
                            f"{datetime.utcnow().isoformat()}Z"
                )

            return

        if field.attribute == "volume_used":
            vu = blank_str_to_none(data.get("Volume Used (uL)"))  # "" -> None for CSVs
            data["Volume Used (uL)"] = float_to_decimal(vu) if vu is not None else None

        elif field.attribute == "concentration":
            conc = blank_str_to_none(data.get("Conc. (ng/uL)"))  # "" -> None for CSVs
            data["Conc. (ng/uL)"] = float_to_decimal(conc) if conc is not None else None

        super().import_field(field, obj, data, is_m2m)

    def before_save_instance(self, instance, using_transactions, dry_run):
        instance.name = instance.extracted_from.name
        instance.alias = instance.extracted_from.alias
        instance.collection_site = instance.extracted_from.collection_site
        instance.experimental_group = instance.extracted_from.experimental_group
        instance.individual = instance.extracted_from.individual
        instance.tissue_source = Sample.BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE.get(
            instance.extracted_from.sample_kind.name, "")

        super().before_save_instance(instance, using_transactions, dry_run)

    def after_save_instance(self, instance, using_transactions, dry_run):
        # Update volume and depletion status of original sample, thus recording
        # that the volume was reduced by an extraction process, including an ID
        # to refer back to the extracted sample.
        instance.extracted_from.volume_history.append(create_volume_history(
            VolumeHistoryUpdateType.EXTRACTION,
            instance.extracted_from.volume - instance.volume_used,
            instance.id
        ))

        instance.extracted_from.update_comment = f"Extracted sample (imported from template) consumed " \
                                                 f"{instance.volume_used} µL."

        instance.extracted_from.save()

        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Imported extracted samples from template.")
