import reversion

from django.contrib.auth import get_user_model
from django.db import migrations


ADMIN_USERNAME = 'biobankadmin'

def create_freezeman_permissions(apps, schema_editor):
    FreezemanPermission = apps.get_model('fms_core', 'FreezemanPermission')

    PERMISSIONS = [
        #{name, description},
        {"name": "launch_experiment_run", "description": "Allow launching an experiment run for the first run processsing."},
        {"name": "relaunch_experiment_run", "description": "Allow launching an experiment run for a run reprocesssing."},
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

def allocate_freezeman_permissions(apps, schema_editor):
    FreezemanPermissionByYser = apps.get_model('fms_core', 'FreezemanPermissionByUser')
    FreezemanUser = apps.get_model('fms_core', 'FreezemanUser')
    FreezemanPermission = apps.get_model('fms_core', 'FreezemanPermission')

    PERMISSIONSBYUSER = [
        #{permission_name, freezeman_username},
        {"permission_name": "launch_experiment_run", "freezeman_username": "ufortier"}
        #{"permission_name": "relaunch_experiment_run", "freezeman_username": "ufortier"},
    ]

    with reversion.create_revision(manage_manually=True):
        User = get_user_model()
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create FreezemanPermissionByUser test entries.")
        reversion.set_user(admin_user)

        for permission_by_user in PERMISSIONSBYUSER:
            freezeman_user = FreezemanUser.objects.get(user__username=permission_by_user["freezeman_username"])
            freezeman_permission = FreezemanPermission.objects.get(name=permission_by_user["permission_name"])
            freezeman_permission_by_user = FreezemanPermissionByYser.objects.create(
                freezeman_user=freezeman_user,
                freezeman_permission=freezeman_permission,
                created_by_id=admin_user.id,
                updated_by_id=admin_user.id,
            )
            reversion.add_to_revision(freezeman_permission_by_user)

class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0075_v5_5_0'),
    ]

    operations = [
        migrations.RunPython(create_freezeman_permissions, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(allocate_freezeman_permissions, reverse_code=migrations.RunPython.noop),
    ]