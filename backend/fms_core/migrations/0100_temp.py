from django.db import migrations, models
import django.db.models.deletion
import reversion

from django.contrib.auth import get_user_model

ADMIN_USERNAME = 'biobankadmin'

# Test experiment 1323
def create_identity_test_data(apps, schema_editor):
    IDENTITIES = [620362, 620363, 620364, 620365]
    READSET_MATCHES = [(74445, 620362, 620362), (None, 620363, 620364), (None, 620364, 620363), (74446, 620363, 620364), (74447, 620364, 620364), (74447, 620364, 620365)]
    
    SampleIdentity = apps.get_model("fms_core", "SampleIdentity")
    SampleIdentityMatch = apps.get_model("fms_core", "SampleIdentityMatch")

    identity_id_by_biosample_id = {}

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create test data. Remove before releasing.")
        reversion.set_user(admin_user)

        for biosample_id in IDENTITIES:
            sample_identity = SampleIdentity.objects.create(biosample_id=biosample_id, conclusive=True, created_by_id=admin_user_id, updated_by_id=admin_user_id)
            identity_id_by_biosample_id[biosample_id] = sample_identity.id
            reversion.add_to_revision(sample_identity)
        
        for readset_id, tested_biosample_id, matched_biosample_id in READSET_MATCHES:
            sample_identity_match = SampleIdentityMatch.objects.create(readset_id=readset_id,
                                                                       tested_id=identity_id_by_biosample_id[tested_biosample_id],
                                                                       matched_id=identity_id_by_biosample_id[matched_biosample_id],
                                                                       matching_site_ratio=0.78,
                                                                       compared_sites=60,
                                                                       created_by_id=admin_user_id,
                                                                       updated_by_id=admin_user_id)
            reversion.add_to_revision(sample_identity_match)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0075_v5_5_0'),
    ]

    operations = [
        migrations.RunPython(create_identity_test_data, reverse_code=migrations.RunPython.noop),
    ]
