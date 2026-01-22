import reversion

from django.contrib.auth import get_user_model
from django.db import migrations

from fms_core.permissions import LaunchExperimentRun, RelaunchExperimentRun

ADMIN_USERNAME = 'biobankadmin'

def create_freezeman_permissions(apps, schema_editor):
    FreezemanPermission = apps.get_model('fms_core', 'FreezemanPermission')

    PERMISSIONS = [
        #{name, description},
        {"name": LaunchExperimentRun.PERMISSION_NAME, "description": "Allow launching an experiment run for the first run processsing."},
        {"name": RelaunchExperimentRun.PERMISSION_NAME, "description": "Allow launching an experiment run for a run reprocesssing."},
    ]

    with reversion.create_revision(manage_manually=True):
        User = get_user_model()
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create FreezemanPermission initial entries.")
        reversion.set_user(admin_user)

        for permission in PERMISSIONS:
            freezeman_permission = FreezemanPermission.objects.create(
                name=permission["name"],
                description=permission["description"],
                created_by_id=admin_user.id,
                updated_by_id=admin_user.id,
            )
            reversion.add_to_revision(freezeman_permission)

class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0075_v5_5_0'),
    ]

    operations = [
        migrations.RunPython(create_freezeman_permissions, reverse_code=migrations.RunPython.noop),
    ]