import json
import reversion

from crequest.middleware import CrequestMiddleware
from datetime import datetime
from django.contrib import messages
from django.db.models import Q
from import_export import resources
from import_export.fields import Field
from import_export.widgets import DateWidget, DecimalWidget, ForeignKeyWidget, JSONWidget
from reversion.models import Version
from tablib import Dataset

from .containers import (
    CONTAINER_SPEC_TUBE,
    CONTAINER_SPEC_TUBE_RACK_8X12,
    SAMPLE_CONTAINER_KINDS,
    SAMPLE_CONTAINER_KINDS_WITH_COORDS,
)
from .models import Container, Sample, Individual
from .utils import (
    RE_SEPARATOR,
    blank_str_to_none,
    VolumeHistoryUpdateType,
    create_volume_history,
    check_truth_like,
    float_to_decimal,
    normalize_scientific_name,
    str_normalize,
    str_cast_and_normalize,
    get_normalized_str,
)


__all__ = [
    "skip_rows",
    "GenericResource",
    "ContainerResource",
    "SampleResource",
    "IndividualResource",
    "ExtractionResource",
    "ContainerMoveResource",
    "ContainerRenameResource",
    "SampleUpdateResource",
]


TEMPORARY_NAME_SUFFIX = "$"


def skip_rows(dataset: Dataset, num_rows: int = 0, col_skip: int = 1) -> None:
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
            data["Container Kind"] = get_normalized_str(data, "Container Kind").lower()
        elif field.attribute == "coordinates":
            # Normalize None coordinates to empty strings
            data["Location Coordinate"] = get_normalized_str(data, "Location Coordinate").upper()
        elif field.attribute == "comment":
            # Normalize None comments to empty strings
            data["Comment"] = get_normalized_str(data, "Comment")
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
    reception_date = Field(attribute='reception_date', column_name='Reception Date', widget=DateWidget())
    phenotype = Field(attribute='phenotype', column_name='Phenotype')
    comment = Field(attribute='comment', column_name='Comment')

    # Computed fields to include in export / display on import

    container_barcode = Field(attribute='container_barcode', column_name='Container Barcode')
    container_kind = Field(attribute='container_kind', column_name='Container Kind')
    container_name = Field(attribute='container_name', column_name='Container Name')
    container_location = Field(attribute='container_location', column_name='Location Barcode')

    # Oddly enough, Location Coord is contextual - when Container Kind is one with coordinates, this
    # specifies the sample's location within the container itself. Otherwise, it specifies the location of
    # the container within the parent container. TODO: Ideally this should be tweaked
    context_sensitive_coordinates = Field(attribute='context_sensitive_coordinates', column_name='Location Coord')

    individual_id = Field(attribute='individual_id', column_name='Individual ID')
    sex = Field(attribute='individual_sex', column_name='Sex')
    taxon = Field(attribute='individual_taxon', column_name='Taxon')
    cohort = Field(attribute='individual_cohort', column_name='Cohort')
    pedigree = Field(attribute='individual_pedigree', column_name='Pedigree')
    mother_id = Field(attribute='individual_mother', column_name='Mother ID')
    father_id = Field(attribute='individual_father', column_name='Father ID')

    volume = Field(attribute='volume', column_name='Volume (uL)', widget=DecimalWidget())

    COMPUTED_FIELDS = frozenset((
        "volume",
        "individual_id",
        "individual_sex",
        "individual_taxon",
        "individual_cohort",
        "individual_pedigree",
        "individual_mother",
        "individual_father",
        "container_barcode",
        "container_kind",
        "container_name",
        "container_location",
        "context_sensitive_coordinates",
    ))

    class Meta:
        model = Sample
        import_id_fields = ("container__barcode", "context_sensitive_coordinates")
        fields = (
            "biospecimen_type",
            "name",
            "alias",
            "concentration",
            "collection_site",
            "container__barcode",
        )
        excluded = ("volume_history", "individual", "depleted", "container")
        export_order = (
            "biospecimen_type",
            "name",
            "alias",
            "cohort",
            "experimental_group",
            "taxon",
            "container_kind",
            "container_name",
            "container_barcode",
            "container_location",
            "context_sensitive_coordinates",
            "individual_id",
            "sex",
            "pedigree",
            "mother_id",
            "father_id",
            "volume",
            "concentration",
            "collection_site",
            "tissue_source",
            "reception_date",
            "phenotype",
            "comment",
        )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)

    def import_obj(self, obj, data, dry_run):
        super().import_obj(obj, data, dry_run)

        # Sample import can optionally create new individuals in the system;
        # or re-use existing ones. Along with the individual associated with
        # the sample, if mother/father IDs are specified, corresponding records
        # can be created by the system.

        taxon = normalize_scientific_name(get_normalized_str(data, "Taxon"))
        pedigree = str_cast_and_normalize(get_normalized_str(data, "Pedigree"))
        cohort = str_cast_and_normalize(get_normalized_str(data, "Cohort"))

        mother = None
        father = None

        if data["Mother ID"]:
            mother, _ = Individual.objects.get_or_create(
                id=get_normalized_str(data, "Mother ID"),
                sex=Individual.SEX_FEMALE,
                taxon=taxon,  # Mother has same taxon as offspring
                **({"pedigree": pedigree} if pedigree else {}),  # Mother has same taxon as offspring
                **({"cohort": cohort} if cohort else {}),  # Mother has same cohort as offspring TODO: Confirm
            )

        if data["Father ID"]:
            father, _ = Individual.objects.get_or_create(
                id=get_normalized_str(data, "Father ID"),
                sex=Individual.SEX_MALE,
                taxon=taxon,  # Father has same taxon as offspring
                **({"pedigree": pedigree} if pedigree else {}),  # Father has same pedigree as offspring
                **({"cohort": cohort} if cohort else {}),  # Father has same cohort as offspring TODO: Confirm
            )

        # TODO: This should throw a nicer warning if the individual already exists
        # TODO: Warn if the individual exists but pedigree/cohort is different
        individual, individual_created = Individual.objects.get_or_create(
            id=get_normalized_str(data, "Individual ID"),
            sex=get_normalized_str(data, "Sex", default=Individual.SEX_UNKNOWN),
            taxon=taxon,
            **({"pedigree": pedigree} if pedigree else {}),
            **({"cohort": cohort} if cohort else {}),
            **({"mother": mother} if mother else {}),
            **({"father": father} if father else {}),
        )
        obj.individual = individual

        # If we're doing a dry run (i.e. uploading for confirmation) and we're
        # re-using an individual, create a warning for the front end; it's
        # quite possible that this is a mistake.
        # TODO: API-generalized method for doing this (currently not possible for React front-end)

        if dry_run and not individual_created:
            request = CrequestMiddleware.get_request()
            messages.warning(request, f"Row {data['#']}: Using existing individual '{individual}' instead of creating "
                                      f"a new one")

        vol = blank_str_to_none(data.get("Volume (uL)"))  # "" -> None for CSVs

        # We store volume as a JSON object of historical values, so this needs to be initialized in a custom way.
        obj.volume_history = [create_volume_history(
            VolumeHistoryUpdateType.UPDATE,
            str(float_to_decimal(vol)) if vol is not None else ""
        )]

    def import_field(self, field, obj, data, is_m2m=False):
        # Ugly hacks lie below

        normalized_container_kind = get_normalized_str(data, "Container Kind").lower()

        if field.attribute == "container_barcode" and normalized_container_kind in SAMPLE_CONTAINER_KINDS:
            # Oddly enough, Location Coord is contextual - when Container Kind
            # is one with coordinates, this specifies the sample's location
            # within the container itself. Otherwise, it specifies the location
            # of the container within the parent container.
            # TODO: Ideally this should be tweaked

            location_barcode = get_normalized_str(data, "Location Barcode")

            try:
                container_parent = Container.objects.get(barcode=location_barcode)
            except Container.DoesNotExist:
                if location_barcode:
                    # If a parent container barcode was specified, raise a
                    # better error message detailing what went wrong.
                    # Otherwise, we assume it was left blank on purpose.
                    raise Container.DoesNotExist(f"Container with barcode {location_barcode} does not exist")
                container_parent = None

            container_data = dict(
                kind=normalized_container_kind,
                name=get_normalized_str(data, "Container Name"),
                barcode=get_normalized_str(data, "Container Barcode"),
                **(dict(location=container_parent) if container_parent else dict(location__isnull=True)),
            )

            normalized_coords = get_normalized_str(data, "Location Coord")

            if normalized_container_kind in SAMPLE_CONTAINER_KINDS_WITH_COORDS:
                # Case where container itself has a coordinate system; in this
                # case the SAMPLE gets the coordinates (e.g. with a plate.)
                obj.coordinates = normalized_coords
            else:
                # Case where the container gets coordinates within the parent
                # (e.g. a tube in a rack).
                container_data["coordinates"] = normalized_coords

            # If needed, create a sample-holding container to store the current
            # sample; or retrieve an existing one with the correct barcode.
            # This will throw an error if the kind specified mismatches with an
            # existing barcode record in the database, which serves as an
            # ad-hoc additional validation step.

            container, _ = Container.objects.get_or_create(**container_data)
            obj.container = container

            return

        elif field.attribute == "experimental_group":
            # Experimental group is stored as a JSON array, so parse out what's
            # going on by splitting the string value into potentially multiple
            # values. If any value is blank, skip it, since it was either the
            # "null" value ("" -> []) or an accidental trailing comma/similar.
            data["Experimental Group"] = json.dumps([
                g.strip()
                for g in RE_SEPARATOR.split(get_normalized_str(data, "Experimental Group"))
                if g.strip()
            ])

        elif field.attribute == "comment":
            # Normalize None comments to empty strings
            data["Comment"] = get_normalized_str(data, "Comment")

        elif field.attribute == "alias":
            # if numeric value entered as alias make sure it's a string
            data["Alias"] = get_normalized_str(data, "Alias")

        elif field.attribute in self.COMPUTED_FIELDS:
            # Ignore importing this, since it's a computed property.
            return

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
    comment = Field(attribute='comment', column_name='Comment')

    class Meta:
        model = Sample
        import_id_fields = ()
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
        export_order = (
            'biospecimen_type',
            'volume_used',
            'sample_container',
            'sample_container_coordinates',
            'container',
            'location',
            'location_coordinates',
            'volume_history',
            'concentration',
            'source_depleted',
            'comment',
        )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 7)  # Skip preamble

    def import_field(self, field, obj, data, is_m2m=False):
        # More!! ugly hacks

        if field.attribute in ('source_depleted', 'context_sensitive_coordinates'):
            # Computed field, skip importing it.
            return

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
            instance.extracted_from.biospecimen_type, "")

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


class IndividualResource(GenericResource):
    class Meta:
        model = Individual
        import_id_fields = ("id",)


# Update resources


def _get_container_pk(**query):
    try:
        return Container.objects.get(**query).pk
    except Container.DoesNotExist:
        raise Container.DoesNotExist(f"Container matching query {query} does not exist")


class ContainerMoveResource(GenericResource):
    barcode = Field(attribute="barcode", column_name="Container Barcode to move")
    # fields that can be updated on container move
    location = Field(attribute="location", column_name="Dest. Location Barcode",
                     widget=ForeignKeyWidget(Container, field="barcode"))
    coordinates = Field(attribute="coordinates", column_name="Dest. Location Coord")
    update_comment = Field(attribute="update_comment", column_name="Update Comment")

    class Meta:
        model = Container
        import_id_fields = ("barcode",)
        fields = (
            "location",
            "coordinates",
            "update_comment",
        )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)  # Skip preamble and normalize dataset

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute == "location":
            data["Dest. Location Barcode"] = get_normalized_str(data, "Dest. Location Barcode")

        if field.attribute == "coordinates":
            data["Dest. Location Coord"] = get_normalized_str(data, "Dest. Location Coord")

        if field.attribute == "update_comment":
            data["Update Comment"] = get_normalized_str(data, "Update Comment")

        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, *args, **kwargs):
        super().after_save_instance(*args, **kwargs)
        reversion.set_comment("Moved containers from template.")


class ContainerRenameResource(GenericResource):
    id = Field(attribute="id")
    barcode = Field(attribute="barcode")  # Computed barcode field for updating
    name = Field(attribute="name", column_name="New Container Name")
    update_comment = Field(attribute="update_comment", column_name="Update Comment")

    def __init__(self):
        super().__init__()
        self.new_barcode_old_barcode_map = {}
        self.new_barcode_old_name_map = {}

    class Meta:
        model = Container
        import_id_fields = ("id",)
        fields = (
            "barcode",
            "name",
            "update_comment",
        )

        use_bulk = True
        batch_size = None

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)  # Skip preamble and normalize dataset

        old_barcodes_set = set()
        id_col = []

        for d in dataset.dict:
            old_barcode = get_normalized_str(d, "Old Container Barcode")
            if old_barcode in old_barcodes_set:
                raise ValueError(f"Cannot rename container with barcode {old_barcode} more than once")

            old_barcodes_set.add(old_barcode)
            id_col.append(_get_container_pk(barcode=old_barcode))

        dataset.append_col(id_col, header="id")

    def import_obj(self, obj, data, dry_run):
        old_container_barcode = get_normalized_str(data, "Old Container Barcode")
        new_container_barcode = get_normalized_str(data, "New Container Barcode")
        new_container_name = get_normalized_str(data, "New Container Name")

        self.new_barcode_old_barcode_map[new_container_barcode] = old_container_barcode
        self.new_barcode_old_name_map[new_container_barcode] = \
            Container.objects.get(barcode=old_container_barcode).name

        # Only set new container name if a new one is specified
        data["New Container Name"] = new_container_name or obj.name
        super().import_obj(obj, data, dry_run)

        # Set the new barcode value
        obj.barcode = new_container_barcode

        # Do some basic validation manually, since bulk_update won't help us out here
        #  - The validators will not be called automatically since we're not running
        #    full_clean, so pass a special kwarg into our clean() implementation to
        #    manually check that the barcodes and names are good without checking for
        #    uniqueness the way full_clean() does.
        obj.normalize()
        obj.clean(check_regexes=True)

        if not dry_run:
            # Append a zero-width space to the barcode / name to avoid triggering integrity errors.
            # These will be removed after the initial import succeeds.
            obj.barcode = obj.barcode + TEMPORARY_NAME_SUFFIX
            obj.name = obj.name + TEMPORARY_NAME_SUFFIX

    def after_save_instance(self, *args, **kwargs):
        super().after_save_instance(*args, **kwargs)
        reversion.set_comment("Renamed containers from template.")

    def after_import(self, dataset, result, using_transactions, dry_run, **kwargs):
        if not dry_run:
            # Remove the zero-width spaces introduced before, ideally without errors.
            # If there are integrity errors, django-import-export will revert to the save-point.
            for container in Container.objects.filter(
                    Q(barcode__endswith=TEMPORARY_NAME_SUFFIX) | Q(name__endswith=TEMPORARY_NAME_SUFFIX)):
                container.barcode = container.barcode.replace(TEMPORARY_NAME_SUFFIX, "")
                container.name = container.name.replace(TEMPORARY_NAME_SUFFIX, "")
                container.save()  # Will also run normalize and full_clean

        return super().after_import(dataset, result, using_transactions, dry_run, **kwargs)


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
    update_comment = Field(attribute="update_comment", column_name="Update Comment")

    class Meta:
        model = Sample
        import_id_fields = ('id',)
        fields = (
            'volume_history',
            'concentration',
            'depleted',
            'update_comment',
        )
        exclude = ('container', 'coordinates')

    @staticmethod
    def _get_sample_pk(**query):
        try:
            return Sample.objects.get(**query).pk
        except Sample.DoesNotExist:
            raise Sample.DoesNotExist(f"Sample matching query {query} does not exist")

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)  # Skip preamble

        # add column 'id' with pk
        dataset.append_col([
            SampleUpdateResource._get_sample_pk(
                container__barcode=get_normalized_str(d, "Container Barcode"),
                coordinates=get_normalized_str(d, "Coord (if plate)"),
            ) for d in dataset.dict
        ], header="id")

        super().before_import(dataset, using_transactions, dry_run, **kwargs)

    def import_field(self, field, obj, data, is_m2m=False):
        if field.attribute == "concentration":
            conc = blank_str_to_none(data.get("New Conc. (ng/uL)"))  # "" -> None for CSVs
            if conc is None:
                return
            data["New Conc. (ng/uL)"] = float_to_decimal(conc)

        if field.attribute == "volume_history":
            # Manually process volume history and don't call superclass method
            vol = blank_str_to_none(data.get("New Volume (uL)"))  # "" -> None for CSVs
            if vol is not None:  # Only update volume if we got a value
                # Note: Volume history should never be None, but this prevents
                #       a bunch of cascading tracebacks if the synthetic "id"
                #       column created above throws a DoesNotExist error.
                if not obj.volume_history:
                    obj.volume_history = []
                obj.volume_history.append(create_volume_history(
                    VolumeHistoryUpdateType.UPDATE,
                    str(float_to_decimal(vol))
                ))
            return

        if field.attribute == 'depleted':
            depleted = blank_str_to_none(data.get("Depleted"))  # "" -> None for CSVs
            if depleted is None:
                return

            if isinstance(depleted, str):  # Strip string values to ensure empty strings get caught
                depleted = depleted.strip()

            # Normalize boolean attribute then proceed normally (only if some value is specified)
            data["Depleted"] = check_truth_like(str(depleted or ""))

        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Updated samples from template.")
