import reversion

from datetime import datetime
from django.utils import timezone
from import_export.fields import Field
from import_export.widgets import DateWidget, DecimalWidget, JSONWidget, ForeignKeyWidget, ManyToManyWidget
from ._generic import GenericResource
from ._utils import skip_rows
from ..models import Container, Process, ProcessSample, Protocol, Sample, SampleKind, SampleLineage
from ..utils import (
    VolumeHistoryUpdateType,
    blank_str_to_none,
    check_truth_like,
    create_volume_history,
    float_to_decimal,
    get_normalized_str,
)


class TransferResource(GenericResource):
    source_container = Field(column_name='Source Container Barcode')
    source_container_coordinates = Field(column_name='Source Location Coord')


    destination_container = Field(attribute='location', column_name='Destination Container Barcode',
                     widget=ForeignKeyWidget(Container, field='barcode'))
    destination_container_coordinates = Field(attribute='context_sensitive_coordinates', column_name='Destination Location Coord')
    destination_container_name = Field(attribute='name', column_name='Destination Container Name')
    destination_container_kind = Field(attribute='kind', column_name='Destination Container Kind')

    destination_parent_container = Field(attribute='destination_parent_container', column_name='Destination Parent Container Barcode',
                      widget=ForeignKeyWidget(Container, field='barcode'))
    destination_parent_container_coordinates = Field(attribute='destination_parent_container_coordinates', column_name='Destination Parent Container Coord')

    source_depleted = Field(attribute='source_depleted', column_name='Source Depleted')
    volume_used = Field(column_name='Volume Used (uL)', widget=DecimalWidget())
    volume = Field(attribute='volume', column_name='Volume (uL)', widget=DecimalWidget())
    transfer_date = Field(attribute='transfer_date', column_name='Transfer Date', widget=DateWidget())
    comment = Field(attribute='comment', column_name='Comment')


    class Meta:
        model = Sample
        # import_id_fields = ()
        # excluded = (
        #     'container',
        #     'coordinates',
        #     'individual',
        #     'child_of',
        #     'concentration',
        #     'volume_used',
        #     'volume_history',
        #     'comment',
        # )
        # export_order = (
        #     'sample_kind',
        #     'sample_container',
        #     'sample_container_coordinates',
        #     'container',
        #     'location',
        #     'location_coordinates',
        #     'volume_history',
        #     'concentration',
        #     'source_depleted',
        #     'creation_date',
        #     'comment',
        # )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 7)  # Skip preamble

    def import_obj(self, obj, data, dry_run):
        self.extracted_from = Sample.objects.get(
            container__barcode=get_normalized_str(data, "Source Container Barcode"),
            coordinates=get_normalized_str(data, "Source Location Coord"),
        )
        # Cast the "Source Depleted" cell to a Python Boolean value and
        # update the original sample if needed. This is the act of the
        # extracted sample depleting the original in the process of its
        # creation.
        self.extracted_from.depleted = (self.extracted_from.depleted or
                                        check_truth_like(get_normalized_str(data, "Source Depleted")))

        # Create a process for the current extraction
        self.process = Process.objects.create(protocol=Protocol.objects.get(name="Transfer"),
                                              comment="Sample Transfer (imported from template)")
        
        super().import_obj(obj, data, dry_run)

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute in ('source_depleted', 'context_sensitive_coordinates', 'child_of'):
            # Computed field, skip importing it.
            return

        if field.attribute == 'volume':
            vol = blank_str_to_none(data.get("Volume (uL)"))  # "" -> None for CSVs
            obj.volume = vol

            obj.volume_history = [create_volume_history(
                VolumeHistoryUpdateType.TRANSFER,
                str(float_to_decimal(vol)) if vol is not None else ""
            )]
            return

        if field.attribute == 'destination_container':
            parent = None;
            destination_parent_container_barcode = get_normalized_str(data, "Destination Parent Container Barcode")

            if destination_parent_container_barcode:
                shared_parent_info = dict(
                    barcode=destination_parent_container_barcode,
                    coordinates=get_normalized_str(data, "Destination Parent Container Coord")
                )
                try:
                    parent = Container.objects.get(**shared_parent_info)
                except Container.DoesNotExist:
                    parent = Container.objects.create(
                        **shared_parent_info,
                        name=shared_parent_info["barcode"],
                        comment=f"Automatically generated via transfer template import on "
                                f"{datetime.utcnow().isoformat()}Z"
                    )


            destination_container_info = dict(
                barcode=get_normalized_str(data, "Destination Container Barcode"),
                kind=get_normalized_str(data, "Destination Container Kind"),
                location=parent,
                coordinates=get_normalized_str(data, "Destination Location Coord"),
            )

            try:
                obj.container = Container.objects.get(**destination_container_info)
            except Container.DoesNotExist:
                obj.container = Container.objects.create(
                    **destination_container_info,
                    name=get_normalized_str(data, "Destination Container Name"),
                    comment=f"Automatically generated via transfer template import on "
                            f"{datetime.utcnow().isoformat()}Z"
                )

            return

        if field.column_name == "Volume Used (uL)":
            vu = blank_str_to_none(data.get("Volume Used (uL)"))  # "" -> None for CSVs
            if vu:
                self.volume_used = float_to_decimal(vu)
                self.extracted_from.volume -= self.volume_used
            else:
                self.volume_used = None
        
        if field.column_name == "Comment":
            data["Comment"] = get_normalized_str(data, "Comment")
            self.comment = data["Comment"]

        super().import_field(field, obj, data, is_m2m)

    def before_save_instance(self, instance, using_transactions, dry_run):
        instance.name = self.extracted_from.name
        instance.alias = self.extracted_from.alias
        instance.sample_kind = self.extracted_from.sample_kind
        instance.collection_site = self.extracted_from.collection_site
        instance.experimental_group = self.extracted_from.experimental_group
        instance.individual = self.extracted_from.individual
        instance.tissue_source = Sample.BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE.get(
            self.extracted_from.sample_kind.name, "")

        self.process_sample = ProcessSample.objects.create(process=self.process,
                                                           source_sample=self.extracted_from,
                                                           execution_date=timezone.now(),
                                                           volume_used=self.volume_used,
                                                           comment=self.comment)

        super().before_save_instance(instance, using_transactions, dry_run)

    def after_save_instance(self, instance, using_transactions, dry_run):
        # Update volume and depletion status of original sample, thus recording
        # that the volume was reduced by an extraction process, including an ID
        # to refer back to the extracted sample.
        self.extracted_from.volume_history.append(create_volume_history(
            VolumeHistoryUpdateType.TRANSFER,
            self.extracted_from.volume,
            instance.id
        ))

        self.extracted_from.save()

        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Imported extracted samples from template.")

    def save_m2m(self, obj, data, using_transactions, dry_run):
        lineage = SampleLineage.objects.create(parent=self.extracted_from, child=obj, process_sample=self.process_sample)
        super().save_m2m(obj, data, using_transactions, dry_run)

    def import_data(self, dataset, dry_run=False, raise_errors=False, use_transactions=None, collect_failed_rows=False, **kwargs):
        results = super().import_data(dataset, dry_run, raise_errors, use_transactions, collect_failed_rows, **kwargs)
        # This is a section meant to simplify the preview offered to the user before confirmation after a dry run
        if dry_run and not len(results.invalid_rows) > 0:
            index_volume_used = results.diff_headers.index("Volume Used (uL)")
            index_comment = results.diff_headers.index("Comment")
            for line, row in enumerate(results.rows):
                if row.diff:
                    row.diff[index_volume_used] = "{:.3f}".format(dataset["Volume Used (uL)"][line])
                    row.diff[index_comment] = dataset["Comment"][line]
        return results