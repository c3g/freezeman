from import_export import resources
from .models import Container, Sample, Individual
import reversion
from reversion.models import Version
from import_export.fields import Field
from import_export.widgets import *
from .widgets import CreateForeignKeyWidget


__all__ = [
    "GenericResource",
    "ContainerResource",
    "SampleResource",
    "IndividualResource",
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

    class Meta:
        model = Container
        import_id_fields = ('barcode',)
        fields = ('kind', 'name', 'barcode', 'location', 'coordinates',)


class SampleResource(GenericResource):
    # simple model fields
    biospecimen_type = Field(attribute='biospecimen_type', column_name='Biospecimen Type')
    name = Field(attribute='name', column_name='Sample Name')
    alias = Field(attribute='alias', column_name='Alias')
    volume = Field(attribute='volume', column_name='Volume (uL)')
    concentration = Field(attribute='concentration', column_name='Conc. (ng/uL)')
    depleted = Field(attribute='depleted', column_name='Source Depleted')
    experimental_group = Field(attribute='experimental_group', column_name='Experimental Group')
    collection_site = Field(attribute='collection_site', column_name='Collection Site')
    tissue_source = Field(attribute='tissue_source', column_name='Tissue Source')
    # reception_date = Field(attribute='reception_date', column_name='Reception Data')
    phenotype = Field(attribute='tissue_source', column_name='Phenotype')
    comment = Field(attribute='reception_date', column_name='Comment')
    # FK fields
    container = Field(attribute='container', column_name='Container Barcode',
                      widget=ForeignKeyWidget(Container, 'barcode'))
    individual = Field(attribute='individual', column_name='Individual Name',
                       widget=CreateForeignKeyWidget(Individual, field='participant_id'))


    class Meta:
        model = Sample
        import_id_fields = ('name',)
        fields = ('biospecimen_type', 'name', 'alias', 'volume', 'concentration', 'collection_site',
                  'container', 'individual')


class IndividualResource(GenericResource):

    class Meta:
        model = Individual
        import_id_fields = ('participant_id',)
