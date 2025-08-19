import reversion
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
from fms_core.models._constants import SampleType


ADMIN_USERNAME = 'biobankadmin'

def create_pacbio_revio_instrument(apps, schema_editor):
    Instrument = apps.get_model("fms_core", "Instrument")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")
    Platform = apps.get_model("fms_core", "Platform")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create instrument for PacBio.")
        reversion.set_user(admin_user)

        platform, _ = Platform.objects.create(
            name="PACBIO_SMRT"
        )
        
        instrument_type, _ = InstrumentType.create(
            platform=platform,
            type="Revio",
            index_read_5_prime="Unknown",
            index_read_3_prime="Unknown"
        )

        instrument, _ = Instrument.objects.create(
            name="Revio",
            type=instrument_type,
            serial_id="r84240"
        )

        reversion.add_to_revision(platform)
        reversion.add_to_revision(instrument_type)
        reversion.add_to_revision(instrument)



class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0071_v5_2_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='identity_flag',
            field=models.BooleanField(blank=True, choices=[(True, 'Passed'), (False, 'Failed')], help_text='Identity flag of the sample.', max_length=20, null=True),
        ),
        migrations.CreateModel(
            name='SampleIdentity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('biosample', models.OneToOneField(help_text='Biosample for the identity.', on_delete=django.db.models.deletion.PROTECT, related_name='sample_identity', to='fms_core.biosample')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('predicted_sex', models.CharField(blank=True, choices=[('M', 'M'), ('F', 'F'), ('Unknown', 'Unknown')], help_text='Sex of the sample.', max_length=10, null=True)),
                ('conclusive', models.BooleanField(default=False, help_text='Flag indicating if the identity qc was conclusive.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SampleIdentityMatch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('matching_site_ratio', models.DecimalField(decimal_places=5, help_text='Ratio of the compared sites that are matching.', max_digits=6)),
                ('compared_sites', models.PositiveIntegerField(help_text='Number of marker sites that have a value for both samples.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_creation', to=settings.AUTH_USER_MODEL)),
                ('tested', models.ForeignKey(help_text='Match found while testing this sample identity.', on_delete=django.db.models.deletion.PROTECT, related_name='tested_identity_match', to='fms_core.sampleidentity')),
                ('matched', models.ForeignKey(help_text='Match found to be referencing this sample identity.', on_delete=django.db.models.deletion.PROTECT, related_name='_matched_identity_match', to='fms_core.sampleidentity')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddConstraint(
            model_name='sampleidentitymatch',
            constraint=models.UniqueConstraint(fields=('tested_id', 'matched_id'), name='sampleidentitymatch_testedid_matchedid_key'),
        ),
        migrations.AddField(
            model_name='sampleidentity',
            name='identity_matches',
            field=models.ManyToManyField(blank=True, through='fms_core.SampleIdentityMatch', to='fms_core.sampleidentity'),
        ),
        migrations.RunPython(add_identity_qc_step, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(initialize_workflows_with_id_check, reverse_code=migrations.RunPython.noop),
    ]
