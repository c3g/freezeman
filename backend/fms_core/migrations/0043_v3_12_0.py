from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

def attach_project_to_derived_sample(apps, schema_editor):
    """
    For each sample_by_project entry we take the sample attribute and we fetch his derived sample (this assume we do not have pools).
    We then insert the sample_by_project.project as the new FK attribute on the derived sample. We skip duplicates (from transfer).

    Args:
        apps: apps class handle
        schema_editor: ignore
    """
    SampleByProject = apps.get_model("fms_core", "SampleByProject")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"Associate projects to derived samples instead of samples.")
        reversion.set_user(admin_user)

        for sample_by_project in SampleByProject.objects.all():
            derived_sample = sample_by_project.sample.derived_samples.first()
            if derived_sample.project is None:
                derived_sample.project_id = sample_by_project.project_id
                derived_sample.save()
                reversion.add_to_revision(derived_sample)

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0042_v3_12_0'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='project',
            name='samples',
        ),
        migrations.AddField(
            model_name='derivedsample',
            name='project',
            field=models.ForeignKey(null=True, blank=True, help_text='Project linked to the derived sample.', on_delete=django.db.models.deletion.PROTECT, related_name='project_derived_samples', to='fms_core.project'),
        ),
        migrations.AlterField(
            model_name='samplebyproject',
            name='project',
            field=models.ForeignKey(help_text='Project to which the sample is associated.', on_delete=django.db.models.deletion.PROTECT, related_name='derived_sample_association', to='fms_core.project'),
        ),
        migrations.AlterField(
            model_name='samplebyproject',
            name='sample',
            field=models.ForeignKey(help_text='Sample assigned to a project.', on_delete=django.db.models.deletion.PROTECT, related_name='project_association', to='fms_core.sample'),
        ),
        migrations.RunPython(
            attach_project_to_derived_sample,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.DeleteModel(
            name='samplebyproject',
        ),
    ]
