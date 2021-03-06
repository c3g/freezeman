import json
import reversion

from django.core.exceptions import ValidationError
from import_export.fields import Field
from import_export.widgets import DateWidget, DecimalWidget, JSONWidget
from ._generic import GenericResource
from ._utils import skip_rows, remove_columns_from_preview
from ..containers import (
    SAMPLE_CONTAINER_KINDS,
    SAMPLE_CONTAINER_KINDS_WITH_COORDS,
)
from ..models import Container, Individual, Sample, SampleKind
from ..utils import (
    RE_SEPARATOR,
    blank_str_to_none,
    get_normalized_str,
    normalize_scientific_name,
    str_cast_and_normalize,
)


__all__ = ["SampleResource"]


class SampleResource(GenericResource):
    # Simple model fields
    sample_kind = Field(attribute='sample_kind_name', column_name='Sample Kind')
    name = Field(attribute='name', column_name='Sample Name')
    alias = Field(attribute='alias', column_name='Alias')
    experimental_group = Field(attribute='experimental_group', column_name='Experimental Group', widget=JSONWidget())
    collection_site = Field(attribute='collection_site', column_name='Collection Site')
    tissue_source = Field(attribute='tissue_source', column_name='Tissue Source')
    concentration = Field(attribute='concentration', column_name='Conc. (ng/uL)', widget=DecimalWidget())
    depleted = Field(attribute='depleted', column_name='Source Depleted')
    creation_date = Field(attribute='creation_date', column_name='Reception Date', widget=DateWidget())
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

    individual_name = Field(attribute='individual_name', column_name='Individual Name')
    sex = Field(attribute='individual_sex', column_name='Sex')
    taxon = Field(attribute='individual_taxon', column_name='Taxon')
    cohort = Field(attribute='individual_cohort', column_name='Cohort')
    pedigree = Field(attribute='individual_pedigree', column_name='Pedigree')
    mother_name = Field(attribute='individual_mother', column_name='Mother ID')
    father_name = Field(attribute='individual_father', column_name='Father ID')

    volume = Field(attribute='volume', column_name='Volume (uL)', widget=DecimalWidget())

    COMPUTED_FIELDS = frozenset((
        "individual_id",
        "individual_name",
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
            "sample_kind",
            "name",
            "alias",
            "concentration",
            "collection_site",
            "container__barcode",
        )
        excluded = ("individual", "depleted", "container")
        export_order = (
            "sample_kind",
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
            "individual_name",
            "sex",
            "pedigree",
            "mother_name",
            "father_name",
            "volume",
            "concentration",
            "collection_site",
            "tissue_source",
            "creation_date",
            "phenotype",
            "comment",
        )

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 6)

    def import_obj(self, obj, data, dry_run):
        errors = {}
        try:
            super().import_obj(obj, data, dry_run)
        except ValidationError as e:
            errors = e.update_error_dict(errors).copy()

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
            try:
                mother, _ = Individual.objects.get_or_create(
                    name=get_normalized_str(data, "Mother ID"),
                    sex=Individual.SEX_FEMALE,
                    taxon=taxon,  # Mother has same taxon as offspring
                    **({"pedigree": pedigree} if pedigree else {}),  # Mother has same pedigree as offspring
                    **({"cohort": cohort} if cohort else {}),  # Mother has same cohort as offspring TODO: Confirm
                )
            except ValidationError as e:
                errors["mother"] = ValidationError(e.messages.pop(), code="invalid")

        if data["Father ID"]:
            try:
                father, _ = Individual.objects.get_or_create(
                    name=get_normalized_str(data, "Father ID"),
                    sex=Individual.SEX_MALE,
                    taxon=taxon,  # Father has same taxon as offspring
                    **({"pedigree": pedigree} if pedigree else {}),  # Father has same pedigree as offspring
                    **({"cohort": cohort} if cohort else {}),  # Father has same cohort as offspring TODO: Confirm
                )
            except ValidationError as e:
                errors["father"] = ValidationError(e.messages.pop(), code="invalid")

        # TODO: This should throw a nicer warning if the individual already exists
        # TODO: Warn if the individual exists but pedigree/cohort is different
        try:
            individual, individual_created = Individual.objects.get_or_create(
                name=get_normalized_str(data, "Individual ID"),
                sex=get_normalized_str(data, "Sex", default=Individual.SEX_UNKNOWN),
                taxon=taxon,
                **({"pedigree": pedigree} if pedigree else {}),
                **({"cohort": cohort} if cohort else {}),
                **({"mother": mother} if mother else {}),
                **({"father": father} if father else {}),
            )
            obj.individual = individual
        except Exception as e:
            individual_created = False
            individual = None
            errors["individual"] = ValidationError(e.messages.pop(), code="invalid")

        # If we're doing a dry run (i.e. uploading for confirmation) and we're
        # re-using an individual, create a warning for the front end; it's
        # quite possible that this is a mistake.
        # TODO: API-generalized method for doing this (currently not possible for React front-end)

        if dry_run and individual and not individual_created:
            self.row_warnings.append(f"Using existing individual '{individual}' instead of creating a new one.")

        if errors:
            raise ValidationError(errors)

    def import_field(self, field, obj, data, is_m2m=False):
        # Ugly hacks lie below

        if field.attribute == "volume":
            obj.volume = blank_str_to_none(data.get("Volume (uL)"))  # "" -> None for CSVs

        elif field.attribute == "collection_site":
            obj.collection_site = get_normalized_str(data, "Collection Site")

        elif field.attribute == "sample_kind_name":
            obj.sample_kind = SampleKind.objects.get(name=data["Sample Kind"])

        elif field.attribute == "container_barcode":
            normalized_container_kind = get_normalized_str(data, "Container Kind").lower()
            if normalized_container_kind in SAMPLE_CONTAINER_KINDS:
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
                        raise ValidationError({"location barcode": ValidationError([f"Container with barcode {location_barcode} does not exist"], code="invalid")})
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

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        reversion.set_comment("Imported samples from template.")

    def import_data(self, dataset, dry_run=False, raise_errors=False, use_transactions=None, collect_failed_rows=False,
                    **kwargs):
        results = super().import_data(dataset, dry_run, raise_errors, use_transactions, collect_failed_rows, **kwargs)
        # This is a section meant to simplify the preview offered to the user before confirmation after a dry run
        if dry_run and not len(results.invalid_rows) > 0:
            COLUMNS_TO_REMOVE = ["container__barcode", "Source Depleted"]
            results = remove_columns_from_preview(results, COLUMNS_TO_REMOVE)
        return results