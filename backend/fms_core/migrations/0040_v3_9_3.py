from django.conf import settings
from django.contrib.auth.models import User
from django.db import migrations
import reversion

ADMIN_USERNAME = 'biobankadmin'


def initialize_taxons(apps, schema_editor):
    Taxon = apps.get_model("fms_core", "Taxon")

    # Canis lupus taxon
    TAXON_CANIS_LUPUS = "Canis lupus"

    taxon_dict = {TAXON_CANIS_LUPUS: 9612}

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Add Taxon Canis Lupus to Freezeman.")
        reversion.set_user(admin_user)

        for name, ncbi_id in taxon_dict.items():
            taxon = Taxon.objects.create(name=name, ncbi_id=ncbi_id, created_by_id=admin_user_id,
                                         updated_by_id=admin_user_id)
            reversion.add_to_revision(taxon)

class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0039_v3_9_0'),
    ]

    operations = [
        migrations.RunPython(
            initialize_taxons,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
