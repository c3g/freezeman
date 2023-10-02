import reversion
from django.contrib.auth.models import User
from django.db import migrations, models

ADMIN_USERNAME = 'biobankadmin'

def create_axiom_related_objects(apps, scheme_editor):
    Platform = apps.get_model("fms_core", "Platform")
    RunType = apps.get_model("fms_core", "RunType")
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id
        platform = Platform.objects.get("AXIOM")
        
        # Create Platform and InstrumentType
        p = Platform.objects.create(name="AXIOM", created_by_id=admin_user_id, updated_by_id=admin_user_id)
        reversion.add_to_revision(p)

        # Create PropertyType and Protocols
        PROPERTY_TYPES_BY_PROTOCOL = {
            "Axiom": [("", "str")],
        }
        
        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name,
                                               created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            for (property, value_type) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                pt = PropertyType.objects.create(name=property,
                                                 object_id=protocol.id,
                                                 content_type=protocol_content_type,
                                                 value_type=value_type,
                                                 is_optional=False,
                                                 created_by_id=admin_user_id, updated_by_id=admin_user_id)
                reversion.add_to_revision(pt)

        # Create RunType Axiom
        rt = RunType.objects.create(name="Axiom",
                                    platform=platform,
                                    protocol=protocol,
                                    needs_run_processing=True,
                                    created_by_id=admin_user_id,
                                    updated_by_id=admin_user_id)
        reversion.add_to_revision(rt)

class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0056_v4_5_0'),
    ]
    operations = [
        migrations.RunPython(
            create_axiom_related_objects,
            reverse_code=migrations.RunPython.noop,
        ),
    ]