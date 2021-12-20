from django.conf import settings
from django.db import migrations, models
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'


def update_property_optional_flag(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Changed the mandatory properties for the DNBSEQ Experiment Run.")
        reversion.set_user(admin_user)

        # Create PropertyType and Protocols
        PROPERTY_TYPES_BY_PROTOCOL = {
            "DNBSEQ Preparation": [("Flowcell Lot", False),
                                   ("Loading Method", False),
                                   ("Sequencer Side", False),
                                   ("Sequencer Kit Used", False),
                                   ("Sequencer Kit Lot", False),
                                   ("Load DNB Cartridge Lot", True),
                                   ("Primer Kit", True),
                                   ("Primer Kit Lot", True),
                                   ("Read 1 Cycles", False),
                                   ("Read 2 Cycles", True),
                                   ("Index 1 Cycles", True),
                                   ("Index 2 Cycles", True),
                                   ],
        }
        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.get(name=protocol_name)

            for (property, is_optional) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                pt = PropertyType.objects.get(name=property,
                                              object_id=protocol.id,
                                              content_type=protocol_content_type)
                pt.is_optional = is_optional
                pt.updated_by_id = admin_user_id
                pt.save()

                reversion.add_to_revision(pt)


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0028_v3_5_0'),
    ]

    operations = [
        migrations.RunPython(
            update_property_optional_flag,
            reverse_code=migrations.RunPython.noop,
        )
    ]