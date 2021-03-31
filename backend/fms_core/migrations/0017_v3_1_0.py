# Generated by Django 3.1 on 2021-03-03 19:08

from django.db import migrations, models, transaction
import django.db.models.deletion
from django.utils import timezone
import json

from ..utils import float_to_decimal


def add_values_to_sample_volume(apps, schema_editor):
    Sample = apps.get_model("fms_core", "Sample")
    for sample in Sample.objects.all().iterator():
        sample.volume = float_to_decimal(sample.volume_history[-1]["volume_value"] if sample.volume_history else 0.0)
        sample.save()


def handle_sample_versions(apps, schema_editor):
    Version = apps.get_model("reversion", "Version")
    SampleKind = apps.get_model("fms_core", "SampleKind")
    sample_kind_ids_by_name = {sample_kind.name: sample_kind.id for sample_kind in SampleKind.objects.all()}

    for version in Version.objects.filter(content_type__model="sample").iterator():
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


def move_volume_history_to_update_process(apps, schema_editor):
    Sample = apps.get_model("fms_core", "Sample")
    Version = apps.get_model("reversion", "Version")
    Revision = apps.get_model("reversion", "Revision")
    Protocol = apps.get_model("fms_core", "Protocol")
    Process = apps.get_model("fms_core", "Process")
    ProcessSample = apps.get_model("fms_core", "ProcessSample")

    update_protocol = Protocol.objects.get(name="Update")

    # Preloading in a dictionary information needed about Revisions
    revisions_dictionary = {}
    for revision in Revision.objects.values('pk', 'comment', 'date_created'):
        revisions_dictionary[revision['pk']] = {'comment': revision['comment'], 'date_created': revision['date_created']}

    for sample_id in Sample.objects.values_list('id', flat=True):
        previous_update_comment = ''
        previous_volume_value = None
        is_first_sample_version = True
        for sample_version in Version.objects.filter(content_type__model="sample", object_id=sample_id).order_by('id'):
            data = json.loads(sample_version.serialized_data)
            update_comment = data[0]["fields"]["update_comment"]
            last_vh = data[0]["fields"]["volume_history"][-1]
            if not is_first_sample_version: # skip first version, as this will be an object creation
                if last_vh["update_type"] == "update": # we only want to get 'Update' processes for this operation
                    # As currently designed, the field 'update_comment' in Sample is overwritten each time there
                    # is an update on the sample and that this field is changed.. Otherwise it remains the same.
                    # We want to ensure that the current update comment does not just correspond to the previous update_comment left
                    # It is better to not display the information out of precaution,
                    # rather than displaying the wrong information (the information will remain in Version anyways)
                    process_sample_comment = (update_comment if update_comment != previous_update_comment else '')

                    revision = revisions_dictionary[sample_version.revision_id]
                    process, _ = Process.objects.get_or_create(comment=f'{revision["comment"]} [Revision ID {str(sample_version.revision_id)}]',
                                                               protocol=update_protocol)

                    ProcessSample.objects.create(process=process,
                                                 source_sample_id=sample_id,
                                                 execution_date=revision['date_created'],
                                                 volume_used=float_to_decimal(float(previous_volume_value) - float(last_vh["volume_value"])),
                                                 comment=process_sample_comment)

            previous_update_comment = update_comment
            previous_volume_value = last_vh["volume_value"]
            is_first_sample_version = False


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
        migrations.RunPython(
            move_volume_history_to_update_process,
            migrations.RunPython.noop
        ),
        migrations.RemoveField(
            model_name='sample',
            name='volume_history',
        ),
    ]
