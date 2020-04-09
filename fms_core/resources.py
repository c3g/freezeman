import reversion

from django.db.models import Q
from import_export import resources
from import_export.fields import Field
from import_export.widgets import *
from reversion.models import Version

from .models import create_volume_history, Container, Sample, ExtractedSample, Individual


__all__ = [
    "GenericResource",
    "ContainerResource",
    "SampleResource",
    "IndividualResource",
    "ExtractionResource",
]


class GenericResource(resources.ModelResource):
    clean_model_instances = True
    skip_unchanged = True

    def after_save_instance(self, instance, using_transactions, dry_run):
        if not dry_run:
            versions = Version.objects.get_for_object(instance)
            if len(versions) >= 1:
                reversion.set_comment("Updated from template.")
            else:
                reversion.set_comment("Imported from template.")


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


class SampleResource(GenericResource):
    # Simple model fields
    biospecimen_type = Field(attribute='biospecimen_type', column_name='Biospecimen Type')
    name = Field(attribute='name', column_name='Sample Name')
    alias = Field(attribute='alias', column_name='Alias')
    concentration = Field(attribute='concentration', column_name='Conc. (ng/uL)', widget=DecimalWidget())
    depleted = Field(attribute='depleted', column_name='Source Depleted')
    experimental_group = Field(attribute='experimental_group', column_name='Experimental Group')
    collection_site = Field(attribute='collection_site', column_name='Collection Site')
    tissue_source = Field(attribute='tissue_source', column_name='Tissue Source')
    reception_date = Field(attribute='reception_date', column_name='Reception Data', widget=DateWidget())
    phenotype = Field(attribute='phenotype', column_name='Phenotype')
    comment = Field(attribute='comment', column_name='Comment')

    # FK fields
    container = Field(attribute='container', column_name='Container Barcode',
                      widget=ForeignKeyWidget(Container, field='barcode'))

    # Non-attribute fields
    volume = Field(column_name='Volume (uL)', widget=DecimalWidget())
    individual_name = Field(column_name='Individual Name')
    sex = Field(column_name='Sex')
    taxon = Field(column_name='Taxon')

    # Computed fields
    individual = Field(attribute='individual', widget=ForeignKeyWidget(Individual, field='participant_id'))
    volume_history = Field(attribute='volume_history', widget=JSONWidget())

    class Meta:
        model = Sample
        import_id_fields = ('name',)
        fields = ('biospecimen_type', 'name', 'alias', 'concentration', 'collection_site',
                  'container')
        excluded = ('volume_history', 'individual')

    def import_field(self, field, obj, data, is_m2m=False):
        # Ugly hacks lie below

        if field.attribute == 'individual':
            ind_data = dict(
                participant_id=data["Individual Name"],  # TODO
                name=data["Individual Name"],
                sex=data["Sex"],
                taxon=data["Taxon"]
            )
            try:
                individual = Individual.objects.get(**ind_data)
                obj.individual = individual
            except Individual.DoesNotExist:
                obj.individual = Individual(**ind_data)
        elif field.attribute == 'volume_history':
            obj.volume_history = [create_volume_history("update", data["Volume (uL)"])]
        else:
            super().import_field(field, obj, data, is_m2m)

    def before_save_instance(self, instance, using_transactions, dry_run):
        instance.individual.save()


class ExtractionResource(GenericResource):
    biospecimen_type = Field(attribute='biospecimen_type', column_name='Extraction Type')

    reception_date = Field(attribute='reception_date')
    concentration = Field(attribute='concentration', column_name='Conc. (ng/uL)', widget=DecimalWidget())
    volume_used = Field(attribute='volume_used', column_name='Volume Used (uL)', widget=DecimalWidget())

    # FK fields
    container = Field(attribute='container', column_name='Nucleic Acid Container Barcode',
                      widget=ForeignKeyWidget(Container, field='barcode'))
    coordinates = Field(attribute='coordinates', column_name='Nucleic Acid Location Coord')

    # Non-attribute fields
    volume = Field(column_name='Volume (uL)', widget=DecimalWidget())
    sample_container = Field(column_name='Container Barcode')
    sample_container_coordinates = Field(column_name='Location Coord')
    source_depleted = Field(column_name='Source Depleted')

    # Computed fields
    name = Field(attribute='name')
    individual = Field(attribute='individual', widget=ForeignKeyWidget(Individual, field='participant_id'))
    extracted_from = Field(attribute='extracted_from', widget=ForeignKeyWidget(Sample, field='name'))

    class Meta:
        model = ExtractedSample
        fields = (
            'biospecimen_type',
            'reception_date',
            'volume',
            'concentration',
            'volume_used',
            'container',
            'coordinates',
        )
        excluded = ('name', 'individual', 'extracted_from')

    def import_field(self, field, obj, data, is_m2m=False):
        # More!! ugly hacks

        if field.attribute == 'extracted_from':
            obj.extracted_from = Sample.objects.get(
                Q(container=data['Container Barcode']) &
                Q(coordinates=data['Location Coord'])
            )
            obj.extracted_from.depleted = data['Source Depleted'].upper() in ('YES', 'Y', 'TRUE', 'T')
        else:
            super().import_field(field, obj, data, is_m2m)

    def before_save_instance(self, instance, using_transactions, dry_run):
        instance.name = instance.extracted_from.name
        instance.individual = instance.extracted_from.individual

        # Update volume and depletion status of original
        instance.extracted_from.volume_history.append(create_volume_history(
            "extraction",
            instance.extracted_from.volume - instance.volume_used,
            instance.extracted_from.id
        ))

        instance.extracted_from.save()

    # TODO: Update original


class IndividualResource(GenericResource):

    class Meta:
        model = Individual
        import_id_fields = ('participant_id',)
