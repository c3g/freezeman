# Generated by Django 3.1 on 2021-05-17 21:39

from django.conf import settings
from django.db import migrations

def rename_process_sample_versions(apps, schema_editor):
    Version = apps.get_model("reversion", "Version")

    versions = Version.objects.filter(content_type__model='processsample')
    for version in versions:
        version.object_repr.replace("ProcessSample", "ProcessMeasurement")
        version.serialized_data.replace("processsample", "processmeasurement")
        version.content_type
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
    ]