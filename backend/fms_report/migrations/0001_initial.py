# Generated by Django 4.2.4 on 2024-11-27 16:59

from django.db import migrations, models
import django.db.models.deletion

from fms_report.models._constants import AggregationType, FieldDataType


def initialize_report(apps, schema_editor):
    REPORTS = [{"name": "production_report", "display_name": "Production", "data_model": "ProductionData"}]
    REPORT_METRICS = {
        "production_report": [
            {
                "name": "sequencing_date",
                "is_date": True,
                "is_group": False,
                "aggregation": None,
                "field_order": 1,
                "display_name": "Date Sequenced",
                "data_type": FieldDataType.DATE,
            },
            {
                "name": "library_creation_date",
                "is_date": False,
                "is_group": False,
                "aggregation": None,
                "field_order": 2,
                "display_name": "Date Library Created",
                "data_type": FieldDataType.DATE,
            },
            {
                "name": "library_capture_date",
                "is_date": False,
                "is_group": False,
                "aggregation": None,
                "field_order": 3,
                "display_name": "Date Library Captured",
                "data_type": FieldDataType.DATE,
            },
            {
                "name": "run_name",
                "is_date": False,
                "is_group": False,
                "aggregation": None,
                "field_order": 18,
                "display_name": "Run Name",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "experiment_run",
                "is_date": False,
                "is_group": False,
                "aggregation": None,
                "field_order": 19,
                "display_name": "Run ID",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "experiment_container_kind",
                "is_date": False,
                "is_group": True,
                "aggregation": None,
                "field_order": 5,
                "display_name": "Flowcell Type",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "lane",
                "is_date": False,
                "is_group": False,
                "aggregation": None,
                "field_order": 16,
                "display_name": "Lane",
                "data_type": FieldDataType.NUMBER,
            },
            {
                "name": "sample_name",
                "is_date": False,
                "is_group": False,
                "aggregation": None,
                "field_order": 12,
                "display_name": "Sample Name",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "library",
                "is_date": False,
                "is_group": False,
                "aggregation": AggregationType.COUNT,
                "field_order": 13,
                "display_name": "Library ID",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "library_batch",
                "is_date": False,
                "is_group": False,
                "aggregation": None,
                "field_order": 14,
                "display_name": "Library Batch ID",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "is_internal_library",
                "is_date": False,
                "is_group": True,
                "aggregation": None,
                "field_order": 15,
                "display_name": "Internal Library",
                "data_type": FieldDataType.BOOLEAN,
            },
            {
                "name": "biosample",
                "is_date": False,
                "is_group": False,
                "aggregation": AggregationType.COUNT,
                "field_order": 11,
                "display_name": "Biosample ID",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "library_type",
                "is_date": False,
                "is_group": True,
                "aggregation": None,
                "field_order": 6,
                "display_name": "Library Type",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "library_selection",
                "is_date": False,
                "is_group": True,
                "aggregation": None,
                "field_order": 7,
                "display_name": "Library Selection",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "project",
                "is_date": False,
                "is_group": True,
                "aggregation": None,
                "field_order": 9,
                "display_name": "Project Name",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "project_external_id",
                "is_date": False,
                "is_group": False,
                "aggregation": None,
                "field_order": 10,
                "display_name": "Project ID",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "principal_investigator",
                "is_date": False,
                "is_group": True,
                "aggregation": None,
                "field_order": 11,
                "display_name": "Principal Investigator",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "taxon",
                "is_date": False,
                "is_group": True,
                "aggregation": None,
                "field_order": 8,
                "display_name": "Taxon",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "technology",
                "is_date": False,
                "is_group": True,
                "aggregation": None,
                "field_order": 4,
                "display_name": "Technology",
                "data_type": FieldDataType.STRING,
            },
            {
                "name": "reads",
                "is_date": False,
                "is_group": False,
                "aggregation": AggregationType.SUM,
                "field_order": 20,
                "display_name": "Reads",
                "data_type": FieldDataType.NUMBER,
            },
            {
                "name": "bases",
                "is_date": False,
                "is_group": False,
                "aggregation": AggregationType.SUM,
                "field_order": 21,
                "display_name": "Bases",
                "data_type": FieldDataType.NUMBER,
            },
        ]
    }

    Report = apps.get_model("fms_report", "Report")
    MetricField = apps.get_model("fms_report", "MetricField")

    for report in REPORTS:
        report_obj = Report.objects.create(name=report["name"], display_name=report["display_name"], data_model=report["data_model"])

        for field in REPORT_METRICS[report["name"]]:
            MetricField.objects.create(name=field["name"],
                                       report=report_obj,
                                       is_date=field["is_date"],
                                       is_group=field["is_group"],
                                       aggregation=field["aggregation"],
                                       field_order=field["field_order"],
                                       display_name=field["display_name"],
                                       data_type=field["data_type"]),


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('fms_core', '0067_v4_13_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='Report',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(default=None, help_text='Internal name by which a report can be identified.', max_length=100, unique=True)),
                ('display_name', models.CharField(help_text='Display name of a report.', max_length=100)),
                ('data_model', models.CharField(default=None, help_text='Name of the model from which to get data.', max_length=100)),
            ],
            options={
                'indexes': [models.Index(fields=['name'], name='report_name_idx')],
            },
        ),
        migrations.CreateModel(
            name='ProductionTracking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('validation_timestamp', models.DateTimeField(blank=True, help_text='Timestamp of the validation status when the data was prepared.', null=True)),
                ('extracted_readset', models.OneToOneField(help_text='Readset for which the data has been prepared.', on_delete=django.db.models.deletion.PROTECT, related_name='production_tracking', to='fms_core.readset')),
            ],
            options={
                'indexes': [models.Index(fields=['validation_timestamp'], name='prodtracking_timestamp_idx')],
            },
        ),
        migrations.CreateModel(
            name='MetricField',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Name of the field containing a report metric.', max_length=100)),
                ('is_date', models.BooleanField(default=False, help_text='Flag indicating if the value can be used to filter by date.')),
                ('is_group', models.BooleanField(default=False, help_text='Flag indicating if the value can be a group for aggregation.')),
                ('aggregation', models.CharField(null=True, blank=True, choices=[('SUM', 'Sum'), ('COUNT', 'Count'), ('MAX', 'Max'), ('MIN', 'Min')], help_text='Aggregation to use on this field.', max_length=100)),
                ('report', models.ForeignKey(help_text='Report to which the field is related.', on_delete=django.db.models.deletion.PROTECT, related_name='metric_fields', to='fms_report.report')),
                ('field_order', models.PositiveIntegerField(help_text='Field order in the report columns.')),
                ('display_name', models.CharField(help_text='Human readable field name.', max_length=100)),
                ('data_type', models.CharField(choices=[('boolean', 'Boolean'), ('string', 'String'), ('number', 'Number'), ('date', 'Date')], help_text="Data type contained in the field.", max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='ProductionData',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sequencing_date', models.DateField(help_text='Date the library was sequenced.')),
                ('library_creation_date', models.DateField(null=True, blank=True, help_text='Date the library was created.')),
                ('library_capture_date', models.DateField(null=True, blank=True, help_text='Date the library was captured.')),
                ('run_name', models.CharField(help_text='Name of the sequencing run.', max_length=200)),
                ('lane', models.PositiveIntegerField(help_text='Sequencing run lane.')),
                ('sample_name', models.CharField(help_text='Sample name.', max_length=200)),
                ('is_internal_library', models.BooleanField(default=False, help_text='Flag that indicates that a library was created locally.')),
                ('library_type', models.CharField(help_text='Name of the library type.', max_length=200)),
                ('library_selection', models.CharField(blank=True, help_text='Name of the library selection protocol.', max_length=200, null=True)),
                ('project', models.CharField(help_text='Name of the project.', max_length=200)),
                ('project_external_id', models.CharField(help_text='External project ID.', max_length=200)),
                ('principal_investigator', models.CharField(null=True, blank=True, help_text='Principal investigator of the project.', max_length=200)),
                ('taxon', models.CharField(null=True, blank=True, help_text='Taxon scientific name.', max_length=200)),
                ('technology', models.CharField(help_text='Sequencing instrument type.', max_length=200)),
                ('reads', models.BigIntegerField(help_text='Number of reads generated during sequencing.')),
                ('bases', models.BigIntegerField(help_text='Number of bases read during sequencing.')),
                ('biosample', models.ForeignKey(help_text='Biosample used to generate the library.', on_delete=django.db.models.deletion.PROTECT, related_name='production_data', to='fms_core.biosample')),
                ('experiment_run', models.ForeignKey(help_text='Experiment run for current data row.', on_delete=django.db.models.deletion.PROTECT, related_name='production_data', to='fms_core.experimentrun')),
                ('experiment_container_kind', models.CharField(help_text='Flowcell type used for the experiment.', max_length=200)),
                ('library', models.ForeignKey(help_text='Derived sample that defines a library.', on_delete=django.db.models.deletion.PROTECT, related_name='production_data', to='fms_core.derivedsample')),
                ('library_batch', models.ForeignKey(null=True, blank=True, help_text='Process that generated the library.', on_delete=django.db.models.deletion.PROTECT, related_name='production_data', to='fms_core.process')),
                ('readset', models.OneToOneField(help_text='Readset for current data row.', on_delete=django.db.models.deletion.PROTECT, related_name='production_data', to='fms_core.readset')),
            ],
            options={
                'indexes': [models.Index(fields=['sequencing_date'], name='productiondata_seqdate_idx'), models.Index(fields=['library_type'], name='productiondata_librarytype_idx'), models.Index(fields=['project'], name='productiondata_project_idx'), models.Index(fields=['technology'], name='productiondata_technology_idx'), models.Index(fields=['taxon'], name='productiondata_taxon_idx'), models.Index(fields=['experiment_container_kind'], name='productiondata_flowcell_idx')],
            },
        ),
        migrations.AddConstraint(
            model_name='productiondata',
            constraint=models.UniqueConstraint(fields=('experiment_run', 'library', 'lane'), name='productiondata_natural_key'),
        ),
        migrations.RunPython(
            initialize_report,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
