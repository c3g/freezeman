from import_export import resources
from .models import Container, Sample, Individual


class ContainerResource(resources.ModelResource):

    class Meta:
        model = Container
        import_id_fields = ('barcode',)
        fields = ('kind', 'name', 'barcode', 'location','coordinates',)
        clean_model_instances = True


class SampleResource(resources.ModelResource):

    class Meta:
        model = Sample
        import_id_fields = ('name',)
        clean_model_instances = True


class IndividualResource(resources.ModelResource):

    class Meta:
        model = Individual
        import_id_fields = ('participant_id',)
        clean_model_instances = True
