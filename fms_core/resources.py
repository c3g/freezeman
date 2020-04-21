import json
import re
import reversion

from datetime import datetime
from django.db.models import Q
from import_export import resources
from import_export.fields import Field
from import_export.widgets import DateWidget, DecimalWidget, ForeignKeyWidget, JSONWidget
from reversion.models import Version

from .containers import (
    CONTAINER_SPEC_TUBE,
    CONTAINER_SPEC_TUBE_RACK_8X12,
    SAMPLE_CONTAINER_KINDS,
    SAMPLE_CONTAINER_KINDS_WITH_COORDS,
)
from .models import create_volume_history, Container, Sample, Individual
from .utils import RE_SEPARATOR, check_truth_like, normalize_scientific_name, str_normalize


__all__ = [
    "GenericResource",
    "ContainerResource",
    "SampleResource",
    "IndividualResource",
    "ExtractionResource",
    "ContainerMoveResource",
    "SampleUpdateResource",
]


def skip_rows(dataset, num_rows=0, col_skip=1):
    if num_rows <= 0:
        return
    dataset_headers = dataset[num_rows - 1]
    dataset_data = dataset[num_rows:]
    dataset.wipe()
    dataset.headers = dataset_headers
    for r in dataset_data:
        vals = set(("" if c is None else c) for c in r[col_skip:])
        if len(vals) == 1 and "" in vals:
            continue
        dataset.append(tuple(str_normalize(c) if isinstance(c, str) else ("" if c is None else c) for c in r))


class GenericResource(resources.ModelResource):
    clean_model_instances = True
    skip_unchanged = True

    def save_instance(self, instance, using_transactions=True, dry_run=False):
        if dry_run:
            with reversion.create_revision(manage_manually=True):
                # Prevent reversion from saving on dry runs by manually overriding the current revision
                super().save_instance(instance, using_transactions, dry_run)
                return

        super().save_instance(instance, using_transactions, dry_run)

    def after_save_instance(self, instance, using_transactions, dry_run):
        if not dry_run:
            versions = Version.objects.get_for_object(instance)
            reversion.set_comment("Updated from template." if len(versions) >= 1 else "Imported from template.")


class ContainerResource(GenericResource):
    kind = Field(attribute='kind', column_name='Container Kind')
    name = Field(attribute='name', column_name='Container Name')
    barcode = Field(attribute='barcode', column_name='Container Barcode')
    location = Field(attribute='location', column_name='Location Barcode',
                     widget=ForeignKeyWidget(Container, 'barcode'))
    coordinates = Field(attribute='coordinates', column_name='Location Coordinate')
    comment = Field(attribute='comment', column_name='Comment')

    class Meta:
        model = Container
        import_id_fields = ('barcode',)
        fields = ('kind', 'name', 'barcode', 'location', 'coordinates',)

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute == "kind":
            # Normalize kind attribute to be lowercase
            data["Container Kind"] = str(data.get("Container Kind") or "").lower()
        elif field.attribute == "coordinates":
            # Normalize None coordinates to empty strings
            data["Location Coordinate"] = str(data.get("Location Coordinate") or "").upper()
        elif field.attribute == "comment":
            # Normalize None comments to empty strings
            data["Comment"] = str(data.get("Comment") or "")
        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Imported containers from template.")


class SampleResource(GenericResource):
    # Simple model fields
    biospecimen_type = Field(attribute='biospecimen_type', column_name='Biospecimen Type')
    name = Field(attribute='name', column_name='Sample Name')
    alias = Field(attribute='alias', column_name='Alias')
    experimental_group = Field(attribute='experimental_group', column_name='Experimental Group', widget=JSONWidget())
    collection_site = Field(attribute='collection_site', column_name='Collection Site')
    tissue_source = Field(attribute='tissue_source', column_name='Tissue Source')
    concentration = Field(attribute='concentration', column_name='Conc. (ng/uL)', widget=DecimalWidget())
    depleted = Field(attribute='depleted', column_name='Source Depleted')
    reception_date = Field(attribute='reception_date', column_name='Reception Data', widget=DateWidget())
    phenotype = Field(attribute='phenotype', column_name='Phenotype')
    comment = Field(attribute='comment', column_name='Comment')
    # FK fields
    container = Field(attribute='container', column_name='Container Barcode',
                      widget=ForeignKeyWidget(Container, field='barcode'))

    # Non-attribute fields
    cohort = Field(attribute='cohort', column_name='Cohort')
    pedigree = Field(attribute='get_pedigree_display', column_name='Pedigree')
    taxon = Field(attribute='get_taxon_display', column_name='Taxon')
    volume = Field(attribute='get_volume_display', column_name='Volume (uL)', widget=DecimalWidget())
    # need it to display on import
    individual_name = Field(attribute='get_name_display', column_name='Individual Name')
    container_kind = Field(attribute='get_kind_display', column_name='Container Kind')
    sex = Field(attribute='get_sex_display', column_name='Sex')
    mother_id = Field(attribute='get_mother_display', column_name='Mother ID')
    father_id = Field(attribute='get_father_display', column_name='Father ID')

    class Meta:
        model = Sample
        import_id_fields = ('container',)  # TODO: Should include coordinates too, but missing field???
        fields = (
            'biospecimen_type',
            'name',
            'alias',
            'concentration',
            'collection_site',
            'container',
        )
        excluded = ('volume_history', 'individual', 'depleted', )
        export_order = (
            'biospecimen_type',
            'name',
            'alias',
            'cohort',
            'experimental_group',
            'taxon',
            'container_kind',
            'container',
            'individual_name',
            'sex',
            'pedigree',
            'mother_id',
            'father_id',
            'volume',
            'concentration',
            'collection_site',
            'tissue_source',
            'reception_date',
            'phenotype',
            'comment',
        )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)

    def import_obj(self, obj, data, dry_run):
        super().import_obj(obj, data, dry_run)

        # Sample import can optionally create new individuals in the system; or re-use existing ones.

        mother = None
        father = None

        taxon = normalize_scientific_name(str(data.get("Taxon") or ""))
        pedigree = str(data.get("Pedigree") or "")
        cohort = str(data.get("Cohort") or "")

        if data["Mother ID"]:
            mother, _ = Individual.objects.get_or_create(
                name=str(data.get("Mother ID") or ""),
                sex=Individual.SEX_FEMALE,
                taxon=taxon,  # Mother has same taxon as offspring
                **({"pedigree": pedigree} if pedigree else {}),  # Mother has same taxon as offspring
                **({"cohort": cohort} if cohort else {}),  # Mother has same cohort as offspring TODO: Confirm
            )

        if data["Father ID"]:
            father, _ = Individual.objects.get_or_create(
                name=str(data.get("Father ID") or ""),
                sex=Individual.SEX_MALE,
                taxon=taxon,  # Father has same taxon as offspring
                **({"pedigree": pedigree} if pedigree else {}),  # Father has same pedigree as offspring
                **({"cohort": cohort} if cohort else {}),  # Father has same cohort as offspring TODO: Confirm
            )

        # TODO: This should throw a warning if the individual already exists
        individual, _ = Individual.objects.get_or_create(
            name=str(data.get("Individual Name") or ""),  # TODO: Normalize properly
            sex=str(data.get("Sex") or Individual.SEX_UNKNOWN),
            taxon=taxon,
            **({"pedigree": pedigree} if pedigree else {}),
            **({"cohort": cohort} if cohort else {}),
            **({"mother": mother} if mother else {}),
            **({"father": father} if father else {}),
        )
        obj.individual = individual

        # We store volume as a JSON object of historical values, so this needs to be initialized in a custom way.
        obj.volume_history = [create_volume_history("update", str(data.get("Volume (uL)") or ""))]

    def import_field(self, field, obj, data, is_m2m=False):
        # Ugly hacks lie below

        normalized_container_kind = str(data.get('Container Kind') or "").lower()

        if field.attribute == 'container' and normalized_container_kind in SAMPLE_CONTAINER_KINDS:
            # Oddly enough, Location Coord is contextual - when Container Kind is one with coordinates, this
            # specifies the sample's location within the container itself. Otherwise, it specifies the location of
            # the container within the parent container.

            container_data = dict(
                kind=normalized_container_kind,
                name=str(data.get("Container Name") or ""),
                barcode=str(data.get("Container Barcode") or ""),
                location=Container.objects.get(barcode=str(data.get("Location Barcode") or "")),
            )

            if normalized_container_kind in SAMPLE_CONTAINER_KINDS_WITH_COORDS:
                # Case where container itself has a coordinate system; in this case the SAMPLE gets the coordinates.
                obj.coordinates = str(data.get("Location Coord") or "")
            else:
                # Case where the container gets coordinates within the parent.
                container_data["coordinates"] = str(data.get("Location Coord") or "")

            # If needed, create a sample-holding container to store the current sample; or retrieve an existing one
            # with the correct barcode. This will throw an error if the kind specified mismatches with an existing
            # barcode record in the database, which serves as an ad-hoc additional validation step.

            container, _ = Container.objects.get_or_create(**container_data)
            obj.container = container

            return

        elif field.attribute == "experimental_group":
            # Experimental group is stored as a JSON array, so parse out what's going on
            data["Experimental Group"] = json.dumps(RE_SEPARATOR.split(str(data.get("Experimental Group") or "")))

        elif field.attribute == "comment":
            # Normalize None comments to empty strings
            data["Comment"] = str(data.get("Comment") or "")

        elif field.attribute == "alias":
            # if numeric value entered as alias make sure it's a string
            data["Alias"] = str(data.get("Alias") or "")

        super().import_field(field, obj, data, is_m2m)

    def before_save_instance(self, instance, using_transactions, dry_run):
        # TODO: Don't think this is needed
        instance.individual.save()
        super().before_save_instance(instance, using_transactions, dry_run)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Imported samples from template.")


class ExtractionResource(GenericResource):
    biospecimen_type = Field(attribute='biospecimen_type', column_name='Extraction Type')

    volume_used = Field(attribute='volume_used', column_name='Volume Used (uL)', widget=DecimalWidget())
    # parent sample container
    sample_container = Field(attribute='get_container_display', column_name='Container Barcode')
    sample_container_coordinates = Field(attribute='get_coordinates_display', column_name='Location Coord')
    # Computed fields
    container = Field(attribute='container', column_name='Nucleic Acid Container Barcode',
                      widget=ForeignKeyWidget(Container, field='barcode'))
    # Non-attribute fields
    location = Field(attribute='location', column_name='Nucleic Acid Location Barcode',
                     widget=ForeignKeyWidget(Container, field='barcode'))
    # TODO throws a coordinates system error
    # coordinates = Field(attribute='coordinates', column_name='Nucleic Acid Location Coord')
    volume_history = Field(attribute='volume_history', widget=JSONWidget())
    concentration = Field(attribute='concentration', column_name='Conc. (ng/uL)', widget=DecimalWidget())
    source_depleted = Field(column_name='Source Depleted')
    # individual = Field(attribute='individual', widget=ForeignKeyWidget(Individual, field='name'))
    extracted_from = Field(attribute='extracted_from', widget=ForeignKeyWidget(Sample, field='name'))
    comment = Field(attribute='comment', column_name='Comment')

    class Meta:
        model = Sample
        fields = (
            'biospecimen_type',
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
        export_order = ('biospecimen_type', 'volume_used', 'sample_container', 'sample_container_coordinates',
                        'container', 'location', 'volume_history', 'concentration', 'source_depleted', 'comment',)

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 7)  # Skip preamble

    def import_field(self, field, obj, data, is_m2m=False):
        # More!! ugly hacks

        if field.attribute == 'volume_history':
            # We store volume as a JSON object of historical values, so this needs to be initialized in a custom way.
            # In this case we are initializing the volume history of the EXTRACTED sample.
            obj.volume_history = [create_volume_history("update", str(data.get("Volume (uL)") or ""))]

        elif field.attribute == 'extracted_from':
            obj.extracted_from = Sample.objects.get(
                Q(container=str(data.get('Container Barcode') or "")) &
                Q(coordinates=str(data.get('Location Coord') or ""))
            )
            # Cast the "Source Depleted" cell to a Python Boolean value and update the original sample if needed.
            obj.extracted_from.depleted = (obj.extracted_from.depleted or
                                           check_truth_like(str(data.get("Source Depleted") or "")))

        elif field.attribute == 'container':
            # Per Alex: We can make new tube racks (8x12) if needed for extractions

            shared_parent_info = dict(
                barcode=str(data.get('Nucleic Acid Location Barcode') or ""),
                # TODO: Currently can only extract into tube racks 8x12 - otherwise this logic will fall apart
                kind=CONTAINER_SPEC_TUBE_RACK_8X12.container_kind_id
            )

            try:
                parent = Container.objects.get(**shared_parent_info)
            except Container.DoesNotExist:
                parent = Container(
                    **shared_parent_info,
                    # Below is creation-specific data
                    # Leave coordinates blank if creating
                    # Per Alex: Container name = container barcode if we auto-generate the container
                    name=shared_parent_info["barcode"],
                    comment=f'Automatically generated via extraction template import on '
                            f'{datetime.utcnow().isoformat()}Z'
                )

            # Per Alex: We can make new tubes if needed for extractions

            # Information that can be used to either retrieve or create a new tube container
            shared_container_info = dict(
                barcode=str(data.get('Nucleic Acid Container Barcode') or ""),
                # TODO: Currently can only extract into tubes - otherwise this logic will fall apart
                kind=CONTAINER_SPEC_TUBE.container_kind_id,
                location=parent,
                coordinates=str(data.get("Nucleic Acid Location Coord") or "")
            )

            try:
                obj.container = Container.objects.get(**shared_container_info)
            except Container.DoesNotExist:
                obj.container = Container(
                    **shared_container_info,
                    # Below is creation-specific data
                    # Per Alex: Container name = container barcode if we auto-generate the container
                    name=shared_container_info["barcode"],
                    comment=f'Automatically generated via extraction template import on '
                            f'{datetime.utcnow().isoformat()}Z'
                )
                obj.container.save()

        else:
            super().import_field(field, obj, data, is_m2m)

    def before_save_instance(self, instance, using_transactions, dry_run):
        instance.name = instance.extracted_from.name
        instance.alias = instance.extracted_from.alias
        instance.collection_site = instance.extracted_from.collection_site  # TODO: Check with Alex
        instance.individual = instance.extracted_from.individual

        # Update volume and depletion status of original
        instance.extracted_from.volume_history.append(create_volume_history(
            "extraction",
            instance.extracted_from.volume - instance.volume_used,
            instance.extracted_from.id
        ))

        instance.extracted_from.save()

        super().before_save_instance(instance, using_transactions, dry_run)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Imported extracted samples from template.")


class IndividualResource(GenericResource):
    class Meta:
        model = Individual
        import_id_fields = ('name',)


# Update resources

class ContainerMoveResource(GenericResource):
    id = Field(attribute='barcode', column_name='Container Barcode to move')
    # fields that can be updated on container move
    location = Field(attribute='location', column_name='Dest. Location Barcode',
                     widget=ForeignKeyWidget(Container, field='barcode'))
    coordinates = Field(attribute='coordinates', column_name='Dest. Location Coord')
    comment = Field(attribute='comment', column_name='Comment')

    class Meta:
        model = Container
        import_id_fields = ('id',)
        fields = (
            'location',
            'coordinates',
            'comment',
        )
        exclude = ('id',)

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)  # Skip preamble and normalize dataset

        # diff fields on Update show up only if the pk is 'id' field ???
        ids = []
        for d in dataset.dict:
            single_id = Container.objects.get(barcode=str(d.get("Container Barcode to move") or ""))
            ids.append(single_id.pk)
        dataset.append_col(ids, header='id')

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute == 'id':
            obj = Container.objects.get(pk=str(data.get("Container Barcode to move") or ""))
            obj.location = Container.objects.get(barcode=str(data.get("Dest. Location Barcode") or ""))
            obj.coordinates = str(data.get("Dest. Location Coord") or "")
            # comment if empty does that mean that comment was removed? or not just not added
            obj.comment = str(data.get("Comment") or "")
            return

        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Moved containers from template.")


class SampleUpdateResource(GenericResource):
    # fields to retrieve a sample
    id = Field(attribute='id', column_name='id')
    container = Field(attribute='container', column_name='Container Barcode',
                      widget=ForeignKeyWidget(Container, field='barcode'))
    coordinates = Field(attribute='coordinates', column_name='Coord (if plate)')
    # fields that can be updated on sample update
    # new volume
    volume_history = Field(attribute='volume_history', column_name='New Volume (uL)')
    # new concentration
    concentration = Field(attribute='concentration', column_name='New Conc. (ng/uL)')
    depleted = Field(attribute="depleted", column_name="Depleted")
    comment = Field(attribute="comment", column_name="Comment")

    class Meta:
        model = Sample
        import_id_fields = ('id',)
        fields = (
            'volume_history',
            'concentration',
            'depleted',
            'comment',
        )
        exclude = ('container', 'coordinates')

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)  # Skip preamble

        # add column 'id' with pk
        ids = []
        for d in dataset.dict:
            single_id = Sample.objects.get(
                Q(container=d.get('Container Barcode') or "") &
                Q(coordinates=d.get('Coord (if plate)') or "")
            )
            ids.append(single_id.pk)
        dataset.append_col(ids, header='id')

        super().before_import(dataset, using_transactions, dry_run, **kwargs)

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute == 'id':
            # Manually process sample ID and don't call superclass method
            obj = Sample.objects.get(pk=str(data.get("id") or ""))
            obj.concentration = str(data.get("New Conc. (ng/uL)") or "")
            obj.comment = str(data.get("Comment") or "")
            return

        if field.attribute == 'volume_history':
            # Manually process volume history and don't call superclass method
            obj.volume_history.append(create_volume_history("update", str(data.get("New Volume (uL)") or "")))
            return

        if field.attribute == 'depleted':
            # Normalize boolean attribute then proceed normally
            data["Depleted"] = check_truth_like(str(data.get("Depleted") or ""))

        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Updated samples from template.")
