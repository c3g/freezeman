import reversion
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
from fms_core.models._constants import SampleType


ADMIN_USERNAME = 'biobankadmin'

def add_identity_qc_step(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Protocol = apps.get_model("fms_core", "Protocol")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Add a step to investigate samples identity.")
        reversion.set_user(admin_user)
        
        protocol = Protocol.objects.create(name="Sample Identity Quality Control",
                                           created_by_id=admin_user_id,
                                           updated_by_id=admin_user_id)
        reversion.add_to_revision(protocol)

        step = Step.objects.create(name="Sample Identity QC",
                                   protocol=protocol,
                                   expected_sample_type=SampleType.EXTRACTED_SAMPLE,
                                   type="PROTOCOL",
                                   created_by_id=admin_user_id,
                                   updated_by_id=admin_user_id)
        reversion.add_to_revision(step)

def initialize_workflows_with_id_check(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Workflow = apps.get_model("fms_core", "Workflow")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    WORKFLOWS = [
        # (name, step_names)
        # Basic Illumina with ID Check
        ("PCR-free Illumina with ID Check", "Basic Illumina with ID Check", ["Extraction (DNA)", "Sample QC (DNA)", "Sample Identity QC", "Normalization (Sample)", "Library Preparation (PCR-free, Illumina)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Experiment Run)", "Experiment Run Illumina"]),
        ("PCR-enriched Illumina with ID Check", "Basic Illumina with ID Check", ["Extraction (DNA)", "Sample QC (DNA)", "Sample Identity QC", "Normalization (Sample)", "Library Preparation (PCR-enriched, Illumina)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Experiment Run)", "Experiment Run Illumina"]),
        ("WGBS Illumina with ID Check", "Basic Illumina with ID Check", ["Extraction (DNA)", "Sample QC (DNA)", "Sample Identity QC", "Normalization (Sample)", "Library Preparation (WGBS, Illumina)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Experiment Run)", "Experiment Run Illumina"]),
        ("RNASeq Illumina with ID Check", "Basic Illumina with ID Check", ["Extraction (RNA)", "Sample QC (RNA)", "Sample Identity QC", "Normalization (Sample)", "Library Preparation (RNASeq, Illumina)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Experiment Run)", "Experiment Run Illumina"]),
        ("miRNA Illumina with ID Check", "Basic Illumina with ID Check", ["Extraction (RNA)", "Sample QC (RNA)", "Sample Identity QC", "Normalization (Sample)", "Library Preparation (miRNA, Illumina)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Experiment Run)", "Experiment Run Illumina"]),
        # Basic DNBSEQ with ID Check
        ("PCR-free DNBSEQ with ID Check", "Basic DNBSEQ with ID Check", ["Extraction (DNA)", "Sample QC (DNA)", "Sample Identity QC", "Normalization (Sample)", "Library Preparation (PCR-free, DNBSEQ)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Experiment Run)", "Experiment Run DNBSEQ"]),
        # Capture Illumina with ID Check
        ("PCR-enriched Capture Exome Illumina with ID Check", "Capture Illumina with ID Check", ["Extraction (DNA)", "Sample QC (DNA)", "Sample Identity QC", "Normalization (Sample)", "Library Preparation (PCR-enriched, Illumina)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Capture Exome)", "Library Capture (Exome)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Experiment Run)", "Experiment Run Illumina"]),
        ("WGBS Capture MCC Illumina with ID Check", "Capture Illumina with ID Check", ["Extraction (DNA)", "Sample QC (DNA)", "Sample Identity QC", "Normalization (Sample)", "Library Preparation (WGBS, Illumina)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Capture MCC)", "Library Capture (MCC)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Experiment Run)", "Experiment Run Illumina"]),
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create the workflows with id check.")
        reversion.set_user(admin_user)

        for name, structure, step_names in WORKFLOWS:
            workflow = Workflow.objects.create(name=name,
                                               structure=structure,
                                               created_by_id=admin_user_id,
                                               updated_by_id=admin_user_id)
            next_step_order = None
            for i, step_name in enumerate(reversed(step_names)):
                step = Step.objects.get(name=step_name)
                order = len(step_names) - i
                step_order = StepOrder.objects.create(workflow=workflow,
                                                      step=step,
                                                      next_step_order=next_step_order,
                                                      order=order,
                                                      created_by_id=admin_user_id,
                                                      updated_by_id=admin_user_id)
                next_step_order = step_order

                reversion.add_to_revision(step_order)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0070_v5_1_0'),
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
                ('matched', models.ForeignKey(help_text='Match found to be referencing this sample identity.', on_delete=django.db.models.deletion.PROTECT, related_name='_matched_identity_match', to='fms_core.sampleidentity')),
                ('tested', models.ForeignKey(help_text='Match found while testing this sample identity.', on_delete=django.db.models.deletion.PROTECT, related_name='tested_identity_match', to='fms_core.sampleidentity')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='sampleidentity',
            name='identity_matches',
            field=models.ManyToManyField(blank=True, through='fms_core.SampleIdentityMatch', to='fms_core.sampleidentity'),
        ),
        migrations.RunPython(add_identity_qc_step, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(initialize_workflows_with_id_check, reverse_code=migrations.RunPython.noop),
    ]
