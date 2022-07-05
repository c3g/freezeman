from django.conf import settings
from django.db import migrations, models
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'


def add_property_types_for_normalization(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Add properties' type for Normalization")
        reversion.set_user(admin_user)

        PROPERTY_TYPES_BY_PROTOCOL = {
            "Normalization": [
                ("Volume", "str"),
                ("Concentration",  "str"),
            ]
        }

        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name, created_by_id=admin_user_id,
                                               updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            for (property, value_type) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                # All properties are required for normalization
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
        ('fms_core', '0039_v3_9_0'),
    ]

    operations = [
        migrations.RunPython(
            add_property_types_for_normalization,
            reverse_code=migrations.RunPython.noop,
        )
    ]