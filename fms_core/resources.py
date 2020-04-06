from import_export import resources
from .models import Container, Sample, Individual
import reversion


class ContainerResource(resources.ModelResource):

    class Meta:
        model = Container
        import_id_fields = ('barcode',)
        fields = ('kind', 'name', 'barcode', 'location', 'coordinates',)
        clean_model_instances = True
        skip_unchanged = True

    def after_save_instance(self, instance, using_transactions, dry_run):
        if not dry_run:
            reversion.set_comment("Imported from template.")


class SampleResource(resources.ModelResource):

    class Meta:
        model = Sample
        import_id_fields = ('name',)
        clean_model_instances = True
        skip_unchanged = True


class IndividualResource(resources.ModelResource):

    class Meta:
        model = Individual
        import_id_fields = ('participant_id',)
        clean_model_instances = True
        skip_unchanged = True
