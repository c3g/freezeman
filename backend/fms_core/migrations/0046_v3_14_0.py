from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

def populate_instrument_serial_id(apps, schema_editor):
    """
    For each existing instrument, populate the new serial_id field with their value.

    Args:
        apps: apps class handle
        schema_editor: ignore
    """
    Instrument = apps.get_model("fms_core", "Instrument")

    INSTRUMENTS = {
      "iScan_1": "iScan_1",
      "01-Marie Curie": "R2130400190016",
      "02-Frida Kahlo": "",
      "03-Jennifer Doudna": "",
    }

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"Populate existing instruments with their respective serial_id.")
        reversion.set_user(admin_user)

        for seq_instrument in Instrument.objects.all():
            seq_instrument.serial_id = INSTRUMENTS[seq_instrument.name]
            seq_instrument.save()
            reversion.add_to_revision(seq_instrument)

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0045_v3_13_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='instrument',
            name='serial_id',
            field=models.CharField(max_length=200, null=True, blank=True, help_text="Internal identifier for the instrument."),
        ),
        migrations.RunPython(
            populate_instrument_serial_id,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='instrument',
            name='serial_id',
            field=models.CharField(max_length=200, unique=True, help_text="Internal identifier for the instrument."),
        )
    ]
