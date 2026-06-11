import reversion

from django.contrib.auth import get_user_model
from django.db import migrations, models


ADMIN_USERNAME = 'biobankadmin'

def set_new_protocol_fields(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")

    LIBRARY_PREPARATION_PROTOCOLS = ["Library Preparation",
                                     "Library Preparation with Selection"]
    EXPERIMENT_RUN_PROTOCOLS = ["Illumina Infinium Preparation",
                                "DNBSEQ Preparation",
                                "Illumina Preparation",
                                "Axiom Experiment Preparation",
                                "PacBio Preparation",
                                "Ultima Preparation"]

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"initialize fields indicating library preparation and experiment run protocols.")
        reversion.set_user(admin_user)

        for protocol_name in LIBRARY_PREPARATION_PROTOCOLS:
            protocol = Protocol.objects.get(name=protocol_name)
            protocol.is_library_preparation = True
            protocol.save()
            reversion.add_to_revision(protocol)
        
        for protocol_name in EXPERIMENT_RUN_PROTOCOLS:
            protocol = Protocol.objects.get(name=protocol_name)
            protocol.is_experiment_run = True
            protocol.save()
            reversion.add_to_revision(protocol)


class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0079_v5_8_0_data'),
    ]

    operations = [
        migrations.AddField(
            model_name='protocol',
            name='is_experiment_run',
            field=models.BooleanField(default=False, help_text='Indicator that the current protocol is an experiment run.'),
        ),
        migrations.AddField(
            model_name='protocol',
            name='is_library_preparation',
            field=models.BooleanField(default=False, help_text='Indicator that the current protocol generates a library.'),
        ),
        migrations.RunPython(set_new_protocol_fields, reverse_code=migrations.RunPython.noop),
    ]