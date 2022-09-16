from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

def attach_project_to_derived_sample(apps, schema_editor):
    """
    For each sample_by_project entry we take the sample attribute and we fetch his derived sample (this assume we do not have pools).
    We then insert the derived sample id in the new attribute derived_sample. This will permit the change from one foreign key to another.

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
            sample_by_project.sample.derived_samples.first()
            if SampleByProject.objects.filter(derived_sample=sample_by_project.sample.derived_samples.first()).exists():
                sample_by_project.delete()
            else:
                sample_by_project.derived_sample = sample_by_project.sample.derived_samples.first()
                sample_by_project.save()
            reversion.add_to_revision(sample_by_project)

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0042_v3_12_0'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='samplebyproject',
            name='sample_by_project_unique',
        ),
        migrations.AddField(
            model_name='samplebyproject',
            name='derived_sample',
            field=models.ForeignKey(null=True, blank=True, help_text='Derived Sample assigned to a project.', on_delete=django.db.models.deletion.PROTECT, related_name='project_association', to='fms_core.derivedsample'),
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
        migrations.AlterField(
            model_name='samplebyproject',
            name='derived_sample',
            field=models.ForeignKey(help_text='Derived Sample assigned to a project.', on_delete=django.db.models.deletion.PROTECT, related_name='project_association', to='fms_core.derivedsample'),
        ),
        migrations.AddConstraint(
            model_name='samplebyproject',
            constraint=models.UniqueConstraint(fields=('derived_sample', 'project'), name='derivedsample_project_key'),
        ),
        migrations.RemoveField(
            model_name='project',
            name='samples',
        ),
        migrations.RemoveField(
            model_name='samplebyproject',
            name='sample',
        ),
        migrations.AddField(
            model_name='derivedsample',
            name='projects',
            field=models.ManyToManyField(blank=True, related_name='derived_samples', through='fms_core.SampleByProject', to='fms_core.Project'),
        ),
        migrations.RenameModel(
            old_name='samplebyproject',
            new_name='derivedsamplebyproject',
        ),
        migrations.AlterField(
            model_name='derivedsample',
            name='projects',
            field=models.ManyToManyField(blank=True, related_name='derived_samples', through='fms_core.DerivedSampleByProject', to='fms_core.Project'),
        ),
        migrations.AlterField(
            model_name='derivedsamplebyproject',
            name='created_by',
            field=models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_derivedsamplebyproject_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='derivedsamplebyproject',
            name='updated_by',
            field=models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_derivedsamplebyproject_modification', to=settings.AUTH_USER_MODEL),
        ),
    ]
