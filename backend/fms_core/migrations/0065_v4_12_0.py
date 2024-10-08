import reversion
from django.db import migrations
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def set_measured_volume_properties_optional(apps, schema_editor):
    PROPERTY_TYPE_NAME = "Measured Volume (uL)"
    PROTOCOL_NAMES = ["Sample Quality Control", "Library Quality Control"]

    PropertyType = apps.get_model("fms_core", "PropertyType")
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    protocol_content_type = ContentType.objects.get_for_model(Protocol)

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        
        reversion.set_comment(f"Set '{PROPERTY_TYPE_NAME}' property types as optional.")
        reversion.set_user(admin_user)

        for protocol_name in PROTOCOL_NAMES:
            object_id = Protocol.objects.get(name=protocol_name).id
            property_type = PropertyType.objects.get(name=PROPERTY_TYPE_NAME, object_id=object_id, content_type=protocol_content_type)
            property_type.is_optional = True
            property_type.save()
            reversion.add_to_revision(property_type)

def add_serial_number_to_instrument_names(apps, schema_editor):
    instrument_name_maps = {
        # "Rosalind Franklin": "LH00375-Rosalind Franklin", already has a serial number
        "Carrie Derick": "A01371R-Carrie Derick",
        "Barbara McClintock": "A01861-Barbara McClintock",
        "Mykonos": "M03555-Mykonos",
        "Maurice": "FS10000133-Maurice",
    }
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment("Prepend serial number to instrument names")
        reversion.set_user(admin_user)

        Instrument = apps.get_model("fms_core", "Instrument")
        for old, new in instrument_name_maps.items():
            instrument = Instrument.objects.get(name=old)
            instrument.name = new
            instrument.save()
            reversion.add_to_revision(instrument)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0064_v4_11_0'),
    ]

    operations = [
        migrations.RunPython(
            set_measured_volume_properties_optional,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='samplekind',
            name='concentration_required',
        ),
        migrations.RunPython(
            add_serial_number_to_instrument_names,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
