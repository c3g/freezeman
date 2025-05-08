from django.db import migrations, models
import django.db.models.deletion


def set_productiondata_project_fk_using_project_name(apps, schema_editor):
    Project = apps.get_model("fms_core", "Project")
    ProductionData = apps.get_model("fms_report", "ProductionData")

    for readsetData in ProductionData.objects.all():
        try:
            project = Project.objects.get(name=readsetData.project)
        except:
            project = Project.objects.get(name__startswith=readsetData.project)
        readsetData.project_fk = project
        readsetData.save()

def set_field_source(apps, schema_editor):
    MetricField = apps.get_model("fms_report", "MetricField")

    FK_METRICS = {"project": "project__name",
                  "project_external_id": "project__external_id",
                  "principal_investigator": "project__principal_investigator",
                  "sample_name": "biosample__alias"}

    for metric_field in MetricField.objects.filter(name__in=FK_METRICS.keys()):
        metric_field.source = FK_METRICS[metric_field.name]
        # change name for project to project_name to disambiguate
        if metric_field.name == "project":
            metric_field.name = "project_name"
        metric_field.save()


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0069_v5_0_0'),
        ('fms_report', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='productiondata',
            name='project_fk',
            field=models.ForeignKey(blank=True, help_text='Project for the sample.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='production_data', to='fms_core.project'),
        ),
        migrations.RunPython(
            set_productiondata_project_fk_using_project_name,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='productiondata',
            name='project_fk',
            field=models.ForeignKey(help_text='Project for the sample.', on_delete=django.db.models.deletion.PROTECT, related_name='production_data', to='fms_core.project'),
        ),
        migrations.RemoveField(
            model_name='productiondata',
            name='project',
        ),
        migrations.RemoveField(
            model_name='productiondata',
            name='project_external_id',
        ),
        migrations.RemoveField(
            model_name='productiondata',
            name='principal_investigator',
        ),
        migrations.RemoveField(
            model_name='productiondata',
            name='sample_name',
        ),
        migrations.RenameField(
            model_name='productiondata',
            old_name='project_fk',
            new_name='project'
        ),
        migrations.AddField(
            model_name='metricfield',
            name='source',
            field=models.CharField(blank=True, help_text='Source of the field on another model for annotation.', max_length=100, null=True),
        ),
        migrations.RunPython(
            set_field_source,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
