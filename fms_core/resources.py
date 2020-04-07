from import_export import resources
from .models import Container, Sample, Individual
import reversion
from reversion.models import Version


class ContainerResource(resources.ModelResource):

    class Meta:
        model = Container
        import_id_fields = ('barcode',)
        fields = ('kind', 'name', 'barcode', 'location','coordinates',)
        clean_model_instances = True
        skip_unchanged = True

    def after_save_instance(self, instance, using_transactions, dry_run):
        if not dry_run:
            versions = Version.objects.get_for_object(instance)
            if len(versions) >= 1:
                reversion.set_comment("Updated from template.")
            else:
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
