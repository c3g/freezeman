import reversion

from django.contrib.auth import get_user_model
from django.db import migrations

ADMIN_USERNAME = 'biobankadmin'
OLD_TO_NEW_STEP_NAMES = {
    'PacBio Experiment Run': 'Experiment Run PacBio',
    'Ultima Experiment Run': 'Experiment Run Ultima',
}

def rename_experiment_run_steps(apps, schema_editor):
    Step = apps.get_model('fms_core', 'Step')
    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        reversion.set_comment('Rename experiment run steps to standard naming.')
        reversion.set_user(admin_user)

        for old_name, new_name in OLD_TO_NEW_STEP_NAMES.items():
            step = Step.objects.get(name=old_name)
            step.name = new_name
            step.save()
            reversion.add_to_revision(step)

class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0078_v5_7_0'),
    ]

    operations = [
        migrations.RunPython(rename_experiment_run_steps, reverse_code=migrations.RunPython.noop),
    ]
