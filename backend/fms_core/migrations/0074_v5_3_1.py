import reversion

from django.contrib.auth import get_user_model

from django.db import migrations


ADMIN_USERNAME = 'biobankadmin'

def create_novaseq_instrument(apps, schema_editor):
    Instrument = apps.get_model("fms_core", "Instrument")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")
    Platform = apps.get_model("fms_core", "Platform")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create instrument Yvette Bonny for Illumina.")
        reversion.set_user(admin_user)

        platform = Platform.objects.get(name="ILLUMINA")
        instrument_type = InstrumentType.objects.get(platform=platform, type="Illumina NovaSeq X")

        instrument = Instrument.objects.create(
            name="Yvette Bonny",
            type=instrument_type,
            serial_id="LH00229R",
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(instrument)

class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0073_v5_3_0'),
    ]

    operations = [
        migrations.RunPython(create_novaseq_instrument, reverse_code=migrations.RunPython.noop),
    ]