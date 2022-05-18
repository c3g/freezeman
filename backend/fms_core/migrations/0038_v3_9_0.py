from django.conf import settings
import django.core.validators
from django.contrib.auth.models import User
from django.db import migrations, models
import django.db.models.deletion
import re
import reversion

ADMIN_USERNAME = 'biobankadmin'


def create_library_conversion_objects(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create objects related to the Library conversion protocol")
        reversion.set_user(admin_user)

        # Create PropertyType and Protocols
        PROPERTY_TYPES_BY_PROTOCOL = {
            "Library Conversion": [
                ("Technician Name", "str"),
                ("Kit Used", "str"),
                ("Kit Lot", "str"),
                ("Thermocycler Used", "str"),
                ("PCR Cycles", "str"),
            ]
        }
        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name, created_by_id=admin_user_id,
                                               updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            for (property, value_type) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                if any([property == 'Technician Name', property == 'Kit Used',
                        property == 'Kit Lot']):
                    is_optional = False
                else:
                    is_optional = True
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
        ('fms_core', '0037_v3_9_0'),
    ]

    operations = [
        migrations.AlterField(
            model_name='propertytype',
            name='name',
            field=models.CharField(help_text='The name of the property.', max_length=200, validators=[
                django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))]),
        ),
        migrations.AlterUniqueTogether(
            name='propertytype',
            unique_together={('name', 'object_id')},
        ),
        migrations.RunPython(
            create_library_conversion_objects,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
