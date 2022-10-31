from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

def populate_sample_alias(apps, schema_editor):
    """
    For each biosample object we retrieve the first sample submitted associated with it and we update the alias
    to be that of this first sample.

    Args:
        apps: apps class handle
        schema_editor: ignore
    """
    Sample = apps.get_model("fms_core", "Sample")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"Populate biosamples' alias with the name of the first submitted sample.")
        reversion.set_user(admin_user)

        for root_sample in Sample.objects.filter(child_of__isnull=True):
            sample_name = root_sample.name
            biosample = root_sample.derived_samples.first().biosample
            if not biosample.alias:
                biosample.alias = sample_name
                biosample.save()
                reversion.add_to_revision(biosample)

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0043_v3_12_0'),
    ]

    operations = [
        migrations.RunPython(
            populate_sample_alias,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='biosample',
            name='alias',
            field=models.CharField(help_text='Alternative biosample name given by the collaborator or customer.',
                                   max_length=200),
        )
    ]
