import reversion
import re

from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def set_dataset_project_fk_using_project_name(apps, schema_editor):
    Project = apps.get_model("fms_core", "Project")
    Dataset = apps.get_model("fms_core", "Dataset")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Insert fk of FMS project for each existing Dataset before removing project related fields.")
        reversion.set_user(admin_user)

        for dataset in Dataset.objects.all():
            try:
                project = Project.objects.get(name=dataset.project_name)
            except:
                project = Project.objects.get(name__startswith=dataset.project_name)
            dataset.project_id = project.id
            dataset.save()
            reversion.add_to_revision(dataset)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0068_v4_14_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='dataset',
            name='project',
            field=models.ForeignKey(blank=True, help_text='Project of the dataset.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='datasets', to='fms_core.project'),
        ),
        migrations.RunPython(
            set_dataset_project_fk_using_project_name,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='dataset',
            name='project',
            field=models.ForeignKey(help_text='Project of the dataset.', on_delete=django.db.models.deletion.PROTECT, related_name='datasets', to='fms_core.project'),
        ),
        migrations.RemoveConstraint(
            model_name='dataset',
            name='dataset_externalprojectid_runname_lane_key',
        ),
        migrations.RemoveField(
            model_name='dataset',
            name='run_name',
        ),
        migrations.RemoveField(
            model_name='dataset',
            name='project_name',
        ),
        migrations.RemoveField(
            model_name='dataset',
            name='external_project_id',
        ),
        migrations.AlterField(
            model_name='dataset',
            name='experiment_run',
            field=models.ForeignKey(help_text='Experiment run matching the dataset.', on_delete=django.db.models.deletion.PROTECT, related_name='datasets', to='fms_core.experimentrun'),
        ),
        migrations.AddConstraint(
            model_name='dataset',
            constraint=models.UniqueConstraint(fields=('project', 'experiment_run', 'lane'), name='dataset_project_experimentrun_lane_key'),
        ),
    ]
