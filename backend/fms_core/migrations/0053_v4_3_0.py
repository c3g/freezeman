from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

import re
import reversion
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def add_library_types(apps, schema_editor):
    LibraryType = apps.get_model("fms_core", "LibraryType")

    LIBRARY_TYPES = [ 
        "HiC",
        "ChIPmentation",
        "ATACSeq",
        "GeoMx_RNA",
        "GeoMx_Protein",
        "10x_Genomics_Linked_Reads_gDNA",
        "10x_Genomics_SC_ATAC",
        "10x_Genomics_SC_CNV",
        "10x_Genomics_SC_Feature_Barcode",
        "10x_Genomics_SC_RNA",
        "10x_Genomics_SC_V-D-J",
        "10x_Genomics_SC_Visium_Spatial_RNA",
        "Amplicon_DNA",
        "Amplicon_RNA",
        "MNase-Seq",
        "TELL-Seq",
        "SHARE-Seq_ATAC",
        "SHARE-Seq_RNA",
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Add more library types that could be submitted for sequencing.")
        reversion.set_user(admin_user)

        for library_type_name in LIBRARY_TYPES:
            library_type = LibraryType.objects.create(name=library_type_name,
                                                      created_by_id=admin_user_id,
                                                      updated_by_id=admin_user_id)
            reversion.add_to_revision(library_type)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0052_v4_2_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='datasetfile',
            name='validation_status',
            field=models.IntegerField(choices=[(0, 'Available'), (1, 'Passed'), (2, 'Failed')], default=0, help_text='The run validation status of the file.'),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='validation_status_timestamp',
            field=models.DateTimeField(blank=True, help_text='The last time the run validation status of the file was changed.', null=True),
        ),
        migrations.CreateModel(
            name='Readset',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='External name that identifies the readset if the run did not come from Freezeman.', max_length=200)),
                ('sample_name', models.CharField(help_text='Name that identifies the sample if the run did not come from Freezeman.', max_length=200)),
                ('derived_sample', models.ForeignKey(blank=True, help_text='Derived sample matching the readset.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='readsets', to='fms_core.derivedsample')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_readset_creation', to=settings.AUTH_USER_MODEL)),
                ('dataset', models.ForeignKey(help_text='Dataset of the readset.', on_delete=django.db.models.deletion.PROTECT, related_name='readsets', to='fms_core.dataset')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_readset_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        ##
        ## Add Migration here in case Dataset_file exist in the DB to connect them to dataset through readset and to copy Sample_name to readset
        ##
        migrations.RemoveField(
            model_name='datasetfile',
            name='dataset',
        ),
        migrations.RemoveField(
            model_name='datasetfile',
            name='sample_name',
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='readset',
            field=models.ForeignKey(help_text='Readset of the file.', on_delete=django.db.models.deletion.PROTECT, related_name='files', to='fms_core.readset'),
        ),
        migrations.AlterField(
            model_name='datasetfile',
            name='file_path',
            field=models.CharField(max_length=4096, help_text="Path to the dataset file."),
        ),
        migrations.AddField(
            model_name='dataset',
            name='experiment_run',
            field=models.ForeignKey(blank=True, help_text='Experiment run matching the dataset.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='datasets', to='fms_core.experimentrun'),
        ),
        migrations.AddField(
            model_name='dataset',
            name='metric_report_url',
            field=models.CharField(blank=True, help_text='URL to the run processing metrics report.', max_length=4096, null=True),
        ),
        migrations.AlterField(
            model_name='experimentrun',
            name='name',
            field=models.CharField(help_text='Name of the run.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))]),
        ),
        migrations.RemoveField(
            model_name='experimentrun',
            name='run_processing_launch_date',
        ),
        migrations.AddField(
            model_name='experimentrun',
            name='end_time',
            field=models.DateTimeField(blank=True, help_text='Time at which the experiment run completed (set by API call).', null=True),
        ),
        migrations.AddField(
            model_name='experimentrun',
            name='run_processing_end_time',
            field=models.DateTimeField(blank=True, help_text='Last time the run processing completed for the experiment run.', null=True),
        ),
        migrations.AddField(
            model_name='experimentrun',
            name='run_processing_launch_time',
            field=models.DateTimeField(blank=True, help_text='Last time the run processing was launched, if it has been launched for the experiment run.', null=True),
        ),
        migrations.AddField(
            model_name='experimentrun',
            name='run_processing_start_time',
            field=models.DateTimeField(blank=True, help_text='Last time the run processing actually started for the experiment run.', null=True),
        ),
        migrations.AlterField(
            model_name='experimentrun',
            name='start_date',
            field=models.DateField(help_text='Date the experiment run was started (submitted by template).'),
        ),
        migrations.CreateModel(
            name='Metric',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='Name for a metric.', max_length=200)),
                ('metric_group', models.CharField(help_text='Grouping of metrics by categories.', max_length=200)),
                ('value_numeric', models.DecimalField(blank=True, decimal_places=20, help_text='Metric numerical value.', max_digits=40, null=True)),
                ('value_string', models.CharField(blank=True, help_text='Metric string value.', max_length=1000, null=True)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_metric_creation', to=settings.AUTH_USER_MODEL)),
                ('readset', models.ForeignKey(help_text='Readset for the metric.', on_delete=django.db.models.deletion.PROTECT, related_name='metrics', to='fms_core.readset')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_metric_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AlterField(
            model_name='samplelineage',
            name='child',
            field=models.ForeignKey(help_text='Child sample.', on_delete=django.db.models.deletion.PROTECT, related_name='child_sample', to='fms_core.sample'),
        ),
        migrations.AlterField(
            model_name='samplelineage',
            name='parent',
            field=models.ForeignKey(help_text='Parent sample.', on_delete=django.db.models.deletion.PROTECT, related_name='parent_sample', to='fms_core.sample'),
        ),
        migrations.RunPython(
            add_library_types,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
