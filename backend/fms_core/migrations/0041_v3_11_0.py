from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import fms_core.schema_validators


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0040_v3_10_0'),
    ]

    operations = [
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('infinium gs 24 beadchip', 'infinium gs 24 beadchip'), ('dnbseq-g400 flowcell', 'dnbseq-g400 flowcell'), ('dnbseq-t7 flowcell', 'dnbseq-t7 flowcell'), ('tube', 'tube'), ('tube strip 2x1', 'tube strip 2x1'), ('tube strip 3x1', 'tube strip 3x1'), ('tube strip 4x1', 'tube strip 4x1'), ('tube strip 5x1', 'tube strip 5x1'), ('tube strip 6x1', 'tube strip 6x1'), ('tube strip 7x1', 'tube strip 7x1'), ('tube strip 8x1', 'tube strip 8x1'), ('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'), ('tube box 3x3', 'tube box 3x3'), ('tube box 6x6', 'tube box 6x6'), ('tube box 7x7', 'tube box 7x7'), ('tube box 8x8', 'tube box 8x8'), ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'), ('tube box 21x10', 'tube box 21x10'), ('tube rack 4x6', 'tube rack 4x6'), ('tube rack 8x12', 'tube rack 8x12'), ('box', 'box'), ('drawer', 'drawer'), ('freezer rack 2x4', 'freezer rack 2x4'), ('freezer rack 3x4', 'freezer rack 3x4'), ('freezer rack 4x4', 'freezer rack 4x4'), ('freezer rack 5x4', 'freezer rack 5x4'), ('freezer rack 6x4', 'freezer rack 6x4'), ('freezer rack 7x4', 'freezer rack 7x4'), ('freezer rack 10x5', 'freezer rack 10x5'), ('freezer rack 8x6', 'freezer rack 8x6'), ('freezer rack 11x6', 'freezer rack 11x6'), ('freezer rack 11x7', 'freezer rack 11x7'), ('freezer 3 shelves', 'freezer 3 shelves'), ('freezer 4 shelves', 'freezer 4 shelves'), ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room')], help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.', max_length=25),
        ),
        migrations.CreateModel(
            name='Dataset',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('external_project_id', models.CharField(max_length=200, help_text='External project id.')),
                ('run_name', models.CharField(help_text='Run name.', max_length=200)),
                ('lane', models.PositiveIntegerField(help_text='Coordinates of the lane in a container')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_dataset_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_dataset_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AlterField(
            model_name='propertyvalue',
            name='value',
            field=models.JSONField(blank=True, help_text='Property value.', validators=[fms_core.schema_validators.JsonSchemaValidator({'$id': 'fms:property_value', '$schema': 'http://json-schema.org/draft-07/schema#', 'description': 'Schema used to define the value in PropertyValue.', 'title': 'PropertyValue value schema', 'type': ['number', 'string', 'boolean']}, formats=None)], verbose_name='Property value'),
        ),
         migrations.AlterField(
            model_name='propertyvalue',
            name='property_type',
            field=models.ForeignKey(help_text='Property type.', on_delete=django.db.models.deletion.PROTECT, related_name='property_values', to='fms_core.propertytype'),
        ),
        migrations.CreateModel(
            name='DatasetFile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('file_path', models.CharField(help_text='Path to the dataset file', max_length=4096)),
                ('sample_name', models.CharField(help_text='The sample that corresponds with this file', max_length=200)),
                ('release_status', models.IntegerField(choices=[(0, 'Available'), (1, 'Released'), (2, 'Blocked')], default=0, help_text='The release status of the file.')),
                ('release_status_timestamp', models.DateTimeField(blank=True, null=True, help_text='The last time the release status of the file was changed.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_datasetfile_creation', to=settings.AUTH_USER_MODEL)),
                ('dataset', models.ForeignKey(help_text='The dataset of the file', on_delete=django.db.models.deletion.PROTECT, related_name='files', to='fms_core.dataset')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_datasetfile_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddConstraint(
            model_name='dataset',
            constraint=models.UniqueConstraint(fields=('external_project_id', 'run_name', 'lane'), name='dataset_externalprojectid_runname_lane_key'),
        ),
        migrations.AddConstraint(
            model_name='datasetfile',
            constraint=models.UniqueConstraint(fields=('file_path',), name='Datasetfile_filepath_key'),
        ),
    ]
