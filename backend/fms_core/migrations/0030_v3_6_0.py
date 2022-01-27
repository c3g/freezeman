from django.conf import settings
from django.db import migrations, models
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'


def create_qpcr_objects(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create objects related to the Sample Selection using qPCR protocol")
        reversion.set_user(admin_user)

        # Create PropertyType and Protocols
        PROPERTY_TYPES_BY_PROTOCOL = {
            "Sample Selection using qPCR": [
                                  ("qPCR Type", "str"),
                                  ("CT Value (Experimental)", "str"),
                                  ("CT Value (Control)", "str"),
                                  ("qPCR Status", "str"),
                                 ]
        }
        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name, created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            for (property, value_type) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                if property == 'CT Value (Control)':
                    is_optional = True
                else:
                    is_optional = False
                pt = PropertyType.objects.create(name=property,
                                                 object_id=protocol.id,
                                                 content_type=protocol_content_type,
                                                 value_type=value_type,
                                                 is_optional=is_optional,
                                                 created_by_id=admin_user_id, updated_by_id=admin_user_id)
                reversion.add_to_revision(pt)


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0029_v3_6_0'),
    ]

    operations = [
        migrations.RunPython(
            create_qpcr_objects,
            reverse_code=migrations.RunPython.noop,
        )
    ]