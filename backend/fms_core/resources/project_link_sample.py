import reversion
from import_export.fields import Field
from import_export.widgets import ForeignKeyWidget
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from ._generic import GenericResource
from ._utils import skip_rows, add_columns_to_preview
from ..models import Project, Sample, Container, SampleByProject
from ..utils import get_normalized_str


__all__ = ["ProjectLinkSampleResource"]

ADD_ACTION = "ADD"
REMOVE_ACTION = "REMOVE"

class ProjectLinkSampleResource(GenericResource):
    action = Field(column_name='Action')
    project_name = Field(column_name='Project Name') 
    sample_name = Field(column_name='Sample Name')
    barcode = Field(column_name='Sample Container Barcode',
                     widget=ForeignKeyWidget(Container, 'barcode'))
    coordinates = Field(column_name='Sample Container Coord')

    class Meta:
        model = SampleByProject
        export_order = ('action', 'project_name', 'sample_name', 'barcode', 'coordinates',)

    def before_import(self, dataset, using_transactions, dry_run, **kwargs):
        skip_rows(dataset, 7)

    def import_obj(self, obj, data, dry_run, **kwargs):
        errors = {}
        # Get field info
        try:
            super().import_obj(obj, data, dry_run, **kwargs)
        except ValidationError as e:
            errors.update(e.update_error_dict(errors).copy())
        # Get sample object
        try:
            obj.sample = Sample.objects.get(name=data["Sample Name"],
                                            container__barcode=data["Sample Container Barcode"],
                                            coordinates=data["Sample Container Coord"])
        except Sample.DoesNotExist:
            obj.sample = None
            errors["sample"] = ValidationError([f"No sample with name [{data['Sample Name']}] at those container coordinates."], code="invalid")
        # Get project object
        try:
            obj.project = Project.objects.get(name=data["Project Name"])
        except Project.DoesNotExist:
            obj.project = None
            errors["project"] = ValidationError([f"No project with name [{data['Project Name']}]"], code="invalid")

        # Set object for deletion if REMOVE_ACTION
        try:
            link_exists = SampleByProject.objects.filter(sample=obj.sample, project=obj.project).exists()
        except ObjectDoesNotExist:
            link_exists = False

        # Perform the desired action
        if data["Action"] == REMOVE_ACTION:
            if link_exists:
                obj.deleted = True
            else:
                errors["link"] = ValidationError([f"Sample [{data['Sample Name']}] is not currently associated to project [{data['Project Name']}]."], code="invalid")
        elif data["Action"] == ADD_ACTION and link_exists:
                errors["link"] = ValidationError([f"Sample [{data['Sample Name']}] is already associated to project [{data['Project Name']}]."], code="invalid")

        if errors:
            raise ValidationError(errors)

    def import_field(self, field, obj, data, is_m2m=False):
        if field.column_name == "Action":
            # Normalize Action attribute to be uppercase
            data["Action"] = get_normalized_str(data, "Action").upper()
        elif field.column_name == "Project Name":
            data["Project Name"] = get_normalized_str(data, "Project Name")
        elif field.column_name == "Sample Name":
            data["Sample Name"] = get_normalized_str(data, "Sample Name")
        elif field.column_name == "Sample Container Barcode":
            data["Sample Container Barcode"] = get_normalized_str(data, "Sample Container Barcode")
        elif field.column_name == "Sample Container Coord":
            data["Sample Container Coord"] = get_normalized_str(data, "Sample Container Coord").upper()
        super().import_field(field, obj, data, is_m2m)

    def after_save_instance(self, instance, using_transactions, dry_run):
        super().after_save_instance(instance, using_transactions, dry_run)
        # If the instance is deleted (saved version), delete the instance
        instance.refresh_from_db()
        if instance.deleted:
            super().instance.delete() # Delete without creating a new deleted version
        reversion.set_comment("Updated project link to samples from template.")

    def import_data(self, dataset, dry_run=False, raise_errors=False, use_transactions=None, collect_failed_rows=False, **kwargs):
        results = super().import_data(dataset, dry_run, raise_errors, use_transactions, collect_failed_rows, **kwargs)

        # This is a section meant to simplify the preview offered to the user before confirmation after a dry run
        if dry_run and not len(results.invalid_rows) > 0:
            missing_columns = ['Action', 'Project Name',
                               'Sample Name', 'Sample Container Barcode',
                               'Sample Container Coord'
                              ]
            results = add_columns_to_preview(results, dataset, missing_columns)

        return results