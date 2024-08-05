import reversion
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def set_blank_project_external_id_to_null(apps, schema_editor):
    Project = apps.get_model("fms_core", "Project")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Replace blank by null external id for projects.")
        reversion.set_user(admin_user)

        for project in Project.objects.filter(external_id="").all():
            project.external_id = None
            project.save()
            reversion.add_to_revision(project)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0063_v4_10_0'),
    ]

    operations = [
        migrations.RunPython(
            set_blank_project_external_id_to_null,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='stephistory',
            name='workflow_action',
            field=models.CharField(choices=[('NEXT_STEP', 'Step complete - Move to next step'), ('DEQUEUE_SAMPLE', 'Sample failed - Remove sample from study workflow'), ('REPEAT_STEP', 'Repeat step - Move to next step and repeat current step'), ('IGNORE_WORKFLOW', 'Ignore workflow - Do not register as part of a workflow')], default='NEXT_STEP', help_text='Workflow action that was performed on the sample after step completion.', max_length=30),
        ),
        migrations.AddField(
            model_name='taxon',
            name='default_reference_genome',
            field=models.ForeignKey(blank=True, help_text='Default reference genome for the taxon when creating individuals.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='default_for_taxons', to='fms_core.referencegenome'),
        ),
    ]
