import reversion
from django.db import migrations
from django.contrib.auth.models import User


ADMIN_USERNAME = 'biobankadmin'

def create_ffpe_sample_kind(apps, schema_editor):
    SampleKind = apps.get_model('fms_core', 'SampleKind')

    with reversion.create_revision():
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_user(admin_user)
        reversion.set_comment("Create FFPE sample kind.")

        ffpe_sample_kind = SampleKind.objects.create(name='FFPE', description='Formalin-Fixed Paraffin-Embedded')
        ffpe_sample_kind.save()
        reversion.add_to_revision(ffpe_sample_kind)

class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0071_v5_2_0'),
    ]

    operations = [
        migrations.RunPython(create_ffpe_sample_kind, reverse_code=migrations.RunPython.noop),
    ]