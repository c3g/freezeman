from typing import cast

import reversion

from django.db import migrations, models
from django.contrib.auth import get_user_model

ADMIN_USERNAME = 'biobankadmin'

def make_library_normalization_step_optional(apps, schema_editor):
    StepOrder = apps.get_model('fms_core', 'StepOrder')
    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        reversion.set_comment('Make Normalization (Library) step optional.')
        reversion.set_user(admin_user)

        step_order = StepOrder.objects.get(
            step__name="Normalization (Library)",
            workflow__name="Ready-to-Sequence Ultima"
        )

        step_order.mandatory = False
        step_order.save()
        reversion.add_to_revision(step_order)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0080_v5_8_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='steporder',
            name='mandatory',
            field=models.BooleanField(default=True, help_text='Samples cannot skip this step in this workflow.'),
        ),
        migrations.AlterField(
            model_name='stephistory',
            name='workflow_action',
            field=models.CharField(choices=[('NEXT_STEP', 'Step complete - Move to next step'), ('DEQUEUE_SAMPLE', 'Sample failed - Remove sample from study workflow'), ('REPEAT_STEP', 'Repeat step - Move to next step and repeat current step'), ('REPEAT_QC_STEP', 'Repeat QC step - Repeat current QC step'), ('SKIP_STEP', 'Step skipped - Move to next step'), ('IGNORE_WORKFLOW', 'Ignore workflow - Do not register as part of a workflow')], default='NEXT_STEP', help_text='Workflow action that was performed on the sample after step completion.', max_length=30),
        ),
        migrations.RunPython(make_library_normalization_step_optional, reverse_code=migrations.RunPython.noop),
    ]
