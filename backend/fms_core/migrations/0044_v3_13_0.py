from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

def populate_sample_alias(apps, schema_editor):
    """
    For each biosample object we retrieve the first sample submitted associated with it and we update the alias of the
    biosample to be that of this first sample.

    Args:
        apps: apps class handle
        schema_editor: ignore
    """
    Biosample = apps.get_model("fms_core", "Biosample")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"Populate biosamples's alias with the name of the first submitted sample.")
        reversion.set_user(admin_user)

        for biosample in Biosample.objects.all():
            first_sample = biosample.derived_samples.order_by('created_at').first().samples.order_by('created_at').first()
            sample_name = first_sample.name
            if biosample.alias is None:
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
    ]
