from import_export import resources
from .models import Container, Sample, Individual
import reversion
from reversion.models import Version
from import_export.fields import Field
from import_export.widgets import *

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
        fields = ('kind', 'name', 'barcode', 'location','coordinates',)


class SampleResource(GenericResource):

    class Meta:
        model = Sample
        import_id_fields = ('name',)


class IndividualResource(GenericResource):

    class Meta:
        model = Individual
        import_id_fields = ('participant_id',)
