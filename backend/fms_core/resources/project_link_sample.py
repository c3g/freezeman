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
        fields = (
            "id",
        )


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

        if obj.sample_id and obj.project_id:
            # Check if link exists to ensure there's not a duplicated association
            if data["Action"] == ADD_ACTION and SampleByProject.objects.filter(sample=obj.sample, project=obj.project).exists():
                errors["link"] = ValidationError(
                    [f"Sample [{data['Sample Name']}] is already associated to project [{data['Project Name']}]."],
                    code="invalid")

            # If the link doesn't exists we can't perform a remove action
            elif data["Action"] == REMOVE_ACTION:
                errors["link"] = ValidationError([f"Sample [{data['Sample Name']}] is not currently associated to project [{data['Project Name']}]."],
                                                     code="invalid")

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

    def for_delete(self, row, instance):
        #We already have an initialized instance because we overloaded get_or_init_instance
        if instance.id:
            return True
        else:
            return False

    def get_or_init_instance(self, instance_loader, row):
        action = row["Action"].upper()
        if action == REMOVE_ACTION:
            try:
                sample = Sample.objects.get(name=row["Sample Name"],
                                            container__barcode=row["Sample Container Barcode"],
                                            coordinates=row["Sample Container Coord"])
                project = Project.objects.get(name=row["Project Name"])

                #Try to get the existing instance
                association_instance = SampleByProject.objects.get(project=project, sample=sample)

                return association_instance, False
            #Continue with validation in case one of the previous queries fails
            except ObjectDoesNotExist:
                return super().init_instance(row), True
        else:
            return super().init_instance(row), True

    def validate_instance(self, instance, import_validation_errors=None, validate_unique=True):
        if "link" in import_validation_errors:
            validate_unique = False
        else:
            validate_unique = True
        super().validate_instance( instance, import_validation_errors, validate_unique)


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