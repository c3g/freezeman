import reversion

from django.db.models import Q
from import_export import resources
from import_export.fields import Field
from import_export.widgets import *
from reversion.models import Version

from .models import create_volume_history, Container, Sample, Individual
from .widgets import CreateIndividualForeignKeyWidget


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
    # volume = Field(column_name='Volume (uL)', widget=DecimalWidget())
    # sex = Field(column_name='Sex')
    # taxon = Field(column_name='Taxon')

    # Computed fields
    individual = Field(attribute='individual', widget=ForeignKeyWidget(Individual, field='participant_id'))
    volume_history = Field(attribute='volume_history', widget=JSONWidget())

    class Meta:
        model = Sample
        import_id_fields = ('name',)
        fields = ('biospecimen_type', 'name', 'alias', 'concentration', 'collection_site',
                  'container', 'individual')
        excluded = ('volume_history',)

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
            print(create_volume_history("update", data["Volume (uL)"]))
            obj.volume_history = [create_volume_history("update", data["Volume (uL)"])]
        else:
            super().import_field(field, obj, data, is_m2m)

    def before_save_instance(self, instance, using_transactions, dry_run):
        instance.individual.save()


class ExtractionResource(GenericResource):
    biospecimen_type = Field(attribute='biospecimen_type', column_name='Extraction Type')

    reception_date = Field(attribute='reception_date')
    volume = Field(attribute='volume', column_name='Volume (uL)', widget=DecimalWidget())
    concentration = Field(attribute='concentration', column_name='Conc. (ng/uL)', widget=DecimalWidget())
    depleted = Field(attribute='depleted', column_name='Source Depleted')
    volume_used = Field(attribute='volume_used', column_name='Volume Used (uL)', widget=DecimalWidget())
    # FK fields
    container = Field(attribute='container', column_name='Nucleic Acid Container Barcode',
                      widget=ForeignKeyWidget(Container, field='barcode'))
    coordinates = Field(attribute='coordinates', column_name='Nucleic Acid Location Coord')

    sample_container = Field(column_name='Container Barcode')
    sample_container_coordinates = Field(column_name='Location Coord')

    # Computed fields

    name = Field(attribute='name')
    individual = Field(attribute='individual', widget=ForeignKeyWidget(Individual, field='participant_id'))
    extracted_from = Field(widget=ForeignKeyWidget(Sample, field='name'))

    class Meta:
        model = Sample
        # import_id_fields = ('sample_container', 'sample_container_coordinates')
        fields = (
            'biospecimen_type',
            'reception_date',
            'volume',
            'concentration',
            'depleted',
            'volume_used',
            'container',
            'coordinates',
            'sample_container',
            'sample_container_coordinates',
        )
        exclude = ('individual', 'extracted_from')

    def before_save_instance(self, instance, using_transactions, dry_run):
        original_sample = Sample.objects.get(
            Q(container=instance.sample_container) &
            Q(coordinates=instance.sample_container_coordinates)
        )

        instance.name = original_sample.name
        instance.individual = original_sample.individual
        instance.extracted_from = original_sample

        # this works
        # instance.extracted_from = Sample.objects.get(name='sample01')

    # TODO: Update original


class IndividualResource(GenericResource):

    class Meta:
        model = Individual
        import_id_fields = ('participant_id',)
