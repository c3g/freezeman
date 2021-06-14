# Generated by Django 3.1 on 2021-05-17 21:39

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import json

def rename_process_sample_versions(apps, schema_editor):
    '''
        In Versions, even though the content_type__model is changed from ProcessSample to ProcessMeasurement,
        there remains traces of ProcessSample in the serialized_data model field, and in the obj repr text.
    '''
    Version = apps.get_model("reversion", "Version")

    # Filtering using serialized_data__contains, because content_type model is now ProcessMeasurement due to model rename
    for version in Version.objects.filter(serialized_data__contains='"model": "fms_core.processsample"'):
        version.object_repr = version.object_repr.replace("ProcessSample", "ProcessMeasurement")

        data = json.loads(version.serialized_data)
        data[0]["model"] = "fms_core.processmeasurement"
        version.serialized_data = json.dumps(data)

        version.save()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0020_v3_2_0'),
    ]

    operations = [
        migrations.RenameModel('ProcessSample', 'ProcessMeasurement'),
        migrations.RenameField('SampleLineage', 'process_sample', 'process_measurement'),
        migrations.RunPython(
            rename_process_sample_versions,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='processmeasurement',
            name='created_by',
            field=models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_processmeasurement_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='processmeasurement',
            name='process',
            field=models.ForeignKey(help_text='Process', on_delete=django.db.models.deletion.PROTECT, related_name='process_measurement', to='fms_core.process'),
        ),
        migrations.AlterField(
            model_name='processmeasurement',
            name='source_sample',
            field=models.ForeignKey(help_text='Source Sample', on_delete=django.db.models.deletion.PROTECT, related_name='process_measurement', to='fms_core.sample'),
        ),
        migrations.AlterField(
            model_name='processmeasurement',
            name='updated_by',
            field=models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_processmeasurement_modification', to=settings.AUTH_USER_MODEL),
        ),
    ]