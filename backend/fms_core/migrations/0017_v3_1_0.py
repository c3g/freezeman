# Generated by Django 3.1 on 2021-03-03 19:08

from django.db import migrations, models, transaction
import django.db.models.deletion
import json

from ..utils import float_to_decimal

def add_values_to_sample_volume(apps, schema_editor):
    Sample = apps.get_model("fms_core", "Sample")
    samples = Sample.objects.all()
    for sample in samples:
        sample.volume = float_to_decimal(sample.volume_history[-1]["volume_value"] if sample.volume_history else 0.0)
        #sample.save()
    Sample.objects.bulk_update(samples, ['volume'])

    Version = apps.get_model("reversion", "Version")
    versions = Version.objects.filter(content_type__model="sample")
    for version in versions:
        data = json.loads(version.serialized_data)
        volume_history = data[0]["fields"]["volume_history"]
        volume = volume_history[-1]["volume_value"] if volume_history else 0.0
        data[0]["fields"]["volume"] = volume
        version.serialized_data = json.dumps(data)
        # version.save()

    Version.objects.bulk_update(versions, ['serialized_data'])


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0016_v3_1_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='volume',
            field=models.DecimalField(decimal_places=3, help_text='Current volume of the sample, in µL. ', max_digits=20, null=True),
        ),
        migrations.RunPython(
            add_values_to_sample_volume,
            migrations.RunPython.noop
        ),
        migrations.AlterField(
            model_name='sample',
            name='volume',
            field=models.DecimalField(decimal_places=3, help_text='Current volume of the sample, in µL. ', max_digits=20),
        ),
        # TODO: deal with Sample.volume_history (for sample updates)
        migrations.RemoveField(
            model_name='sample',
            name='volume_used',
        ),


    ]
