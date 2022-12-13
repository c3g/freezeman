from django.contrib.auth.models import User
from django.db import migrations, models
import reversion

ADMIN_USERNAME = 'biobankadmin'


def create_sample_pooling_protocol(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create sample pooling protocol")
        reversion.set_user(admin_user)

        SAMPLE_POOLING_PROTOCOL = "Sample Pooling"

        protocol = Protocol.objects.create(name=SAMPLE_POOLING_PROTOCOL, created_by_id=admin_user_id, updated_by_id=admin_user_id)
        reversion.add_to_revision(protocol)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0041_v3_11_0'),
    ]

    operations = [
        migrations.RunPython(
            create_sample_pooling_protocol,
            reverse_code=migrations.RunPython.noop,
        )
    ]