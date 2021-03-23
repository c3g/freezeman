# Generated by Django 3.1 on 2021-03-03 19:08

from django.db import migrations, models, transaction
import django.db.models.deletion
import json

from ..utils import float_to_decimal

def add_values_to_sample_volume(apps, schema_editor):
    Sample = apps.get_model("fms_core", "Sample")
    for sample in Sample.objects.all():
        sample.volume = float_to_decimal(sample.volume_history[-1]["volume_value"] if sample.volume_history else 0.0)
        sample.save()


def handle_sample_versions(apps, schema_editor):
    Version = apps.get_model("reversion", "Version")
    SampleKind = apps.get_model("fms_core", "SampleKind")
    sample_kind_ids_by_name = {sample_kind.name: sample_kind.id for sample_kind in SampleKind.objects.all()}

    for version in Version.objects.filter(content_type__model="sample"):
        data = json.loads(version.serialized_data)

        # Handle biospecimen type change to sample_kind_id
        data[0]["fields"]["sample_kind"] = sample_kind_ids_by_name[data[0]["fields"]["biospecimen_type"]]
        data[0]["fields"].pop("biospecimen_type", None)

        # Change sample versions for creation dates
        data[0]["fields"]["creation_date"] = data[0]["fields"]["reception_date"]
        data[0]["fields"].pop("reception_date", None)

        # Pop fields extracted_from and volume_used
        data[0]["fields"].pop("extracted_from", None)
        data[0]["fields"].pop("volume_used", None)

        # Handle Volume History to Volume
        volume_history = data[0]["fields"]["volume_history"]
        data[0]["fields"]["volume"] = volume_history[-1]["volume_value"] if volume_history else 0.0

        version.serialized_data = json.dumps(data)
        version.save()

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
        migrations.RunPython(
            handle_sample_versions,
            migrations.RunPython.noop
        ),
        migrations.RemoveField(
            model_name='sample',
            name='volume_used',
        ),


    ]
