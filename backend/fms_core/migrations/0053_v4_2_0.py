from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0052_v4_2_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='dataset',
            name='metric_report_url',
            field=models.CharField(blank=True, help_text='URL to the run processing metrics report.', max_length=4096, null=True),
        ),
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
            name='Metric',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='Name for a metric.', max_length=200)),
                ('value_numeric', models.DecimalField(blank=True, decimal_places=15, help_text='Metric numerical value.', max_digits=40, null=True)),
                ('value_string', models.CharField(blank=True, help_text='Metric string value.', max_length=1000, null=True)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_metric_creation', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='SampleRunMetric',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_samplerunmetric_creation', to=settings.AUTH_USER_MODEL)),
                ('dataset_file', models.ForeignKey(help_text='The dataset for the sample run.', on_delete=django.db.models.deletion.PROTECT, related_name='sample_run_metrics', to='fms_core.datasetfile')),
                ('experiment_run', models.ForeignKey(null=True, blank=True, help_text='Experiment run for the sample metric.', on_delete=django.db.models.deletion.PROTECT, related_name='sample_run_metrics', to='fms_core.experimentrun')),
                ('metric', models.ForeignKey(help_text='Metric for the sample run.', on_delete=django.db.models.deletion.PROTECT, related_name='sample_run_metrics', to='fms_core.metric')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_samplerunmetric_modification', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='MetricGroup',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='Name for a grouping of metrics.', max_length=200)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_metricgroup_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_metricgroup_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='metric',
            name='metric_group',
            field=models.ForeignKey(help_text='The metric group.', on_delete=django.db.models.deletion.PROTECT, related_name='metrics', to='fms_core.metricgroup'),
        ),
        migrations.AddField(
            model_name='metric',
            name='updated_by',
            field=models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_metric_modification', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddConstraint(
            model_name='samplerunmetric',
            constraint=models.UniqueConstraint(fields=('experiment_run_id', 'dataset_file_id', 'metric_id'), name='Samplerunmetric_derivedsampleid_experimentrunid_datasetfileid_metricid_key'),
        ),
    ]
