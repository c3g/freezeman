from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

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
                ('name', models.CharField(help_text='The external name that identifies the readset if the run did not come from Freezeman.', max_length=200)),
                ('sample_name', models.CharField(help_text='The sample name that identifies the readset if the run did not come from Freezeman.', max_length=200)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_readset_creation', to=settings.AUTH_USER_MODEL)),
                ('dataset', models.ForeignKey(help_text='The dataset of the readfile.', on_delete=django.db.models.deletion.PROTECT, related_name='readsets', to='fms_core.dataset')),
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
            field=models.ForeignKey(help_text='The readset of the file', on_delete=django.db.models.deletion.PROTECT, related_name='files', to='fms_core.readset'),
        ),
        migrations.AddField(
            model_name='experimentrun',
            name='metric_report_url',
            field=models.CharField(blank=True, help_text='URL to the run processing metrics report.', max_length=4096, null=True),
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
            name='SampleRunMetric',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_samplerunmetric_creation', to=settings.AUTH_USER_MODEL)),
                ('derived_sample', models.ForeignKey(blank=True, help_text='Derived sample matching the metrics.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='sample_run_metrics', to='fms_core.derivedsample')),
                ('experiment_run', models.ForeignKey(blank=True, help_text='Experiment run for the sample metrics.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='sample_run_metrics', to='fms_core.experimentrun')),
                ('readset', models.OneToOneField(help_text='Readset from which were taken the sample metrics.', on_delete=django.db.models.deletion.PROTECT, related_name='sample_run_metric', to='fms_core.readset')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_samplerunmetric_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
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
                ('sample_run_metric', models.ForeignKey(help_text='Readset, Derived sample and experiment run for the metric.', on_delete=django.db.models.deletion.PROTECT, related_name='metrics', to='fms_core.samplerunmetric')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_metric_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
