import reversion
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def move_project_fk_to_derivedbysample(apps, schema_editor):
    DerivedBySample = apps.get_model("fms_core", "DerivedBySample")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Copy to derived_by_sample model from derived_sample the project foreign key.")
        reversion.set_user(admin_user)

        for derived_by_sample in DerivedBySample.objects.select_related("derived_sample__project").all():
            derived_by_sample.project = derived_by_sample.derived_sample.project
            derived_by_sample.save()
            reversion.add_to_revision(derived_by_sample)
            

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0062_v4_9_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='derivedbysample',
            name='project',
            field=models.ForeignKey(null=True, blank=True, help_text='Project linked to the derived sample - sample pair.', on_delete=django.db.models.deletion.PROTECT, related_name='project_derived_by_samples', to='fms_core.project'),
        ),
        migrations.RunPython(
            move_project_fk_to_derivedbysample,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='derivedsample',
            name='project',
        ),
    ]
