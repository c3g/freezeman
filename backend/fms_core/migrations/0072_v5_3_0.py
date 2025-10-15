import re
import reversion

from django.conf import settings
from django.contrib.auth import get_user_model
import django.core.validators
from django.db import migrations, models

from fms_core.models._constants import INDEX_READ_FORWARD, SampleType, StepType


ADMIN_USERNAME = 'biobankadmin'

def create_pacbio_revio_instrument(apps, schema_editor):
    Instrument = apps.get_model("fms_core", "Instrument")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")
    Platform = apps.get_model("fms_core", "Platform")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create instrument for PacBio.")
        reversion.set_user(admin_user)

        # already exists in db 2024/07/21
        platform, _ = Platform.objects.get_or_create(
            name="PACBIO_SMRT",
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(platform)

        instrument_type = InstrumentType.objects.create(
            platform=platform,
            type="PacBio Revio",
            index_read_5_prime=INDEX_READ_FORWARD,
            index_read_3_prime=INDEX_READ_FORWARD,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(instrument_type)

        instrument = Instrument.objects.create(
            name="Revio",
            type=instrument_type,
            serial_id="r84240",
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(instrument)


PACBIO_EXPERIMENT_RUN_STEP_NAME = "PacBio Experiment Run"
def create_pacbio_experiment_run_step(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Protocol = apps.get_model("fms_core", "Protocol")
    Platform = apps.get_model("fms_core", "Platform")
    RunType = apps.get_model("fms_core", "RunType")
    ContentType = apps.get_model('contenttypes', 'ContentType')
    PropertyType = apps.get_model("fms_core", "PropertyType")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create step for PacBio Experiment Run.")
        reversion.set_user(admin_user)

        protocol = Protocol.objects.create(
            name="PacBio Preparation",
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(protocol)

        platform = Platform.objects.get(name="PACBIO_SMRT")
        run_type = RunType.objects.create(
            name="PacBio",
            platform=platform,
            protocol=protocol,
            needs_run_processing=True,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(run_type)

        protocol_content_type = ContentType.objects.get_for_model(Protocol)
        PROPERTY_TYPE_NAMES = [
            "Loading Concentration (pM)",
            "Run Time",
            "Sequencer Position",
            "Sequencing Kit Lot",
            "SMRT Link Run ID"
        ]
        for property_type_name in PROPERTY_TYPE_NAMES:
            pt = PropertyType.objects.create(
                name=property_type_name,
                value_type="str",
                is_optional=False,
                object_id=protocol.id,
                content_type=protocol_content_type,
                created_by_id=admin_user_id, updated_by_id=admin_user_id
            )
            reversion.add_to_revision(pt)

        step = Step.objects.create(
            name=PACBIO_EXPERIMENT_RUN_STEP_NAME,
            protocol=protocol,
            type=StepType.PROTOCOL,
            expected_sample_type=SampleType.LIBRARY,
            needs_placement=True,
            needs_planning=False,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(step)

def create_pacbio_ready_to_sequence_workflow(apps, schema_editor):
    Workflow = apps.get_model("fms_core", "Workflow")
    Step = apps.get_model("fms_core", "Step")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    experiment_run_step = Step.objects.get(name=PACBIO_EXPERIMENT_RUN_STEP_NAME)

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"Create workflow for PacBio ready to sequence.")
        reversion.set_user(admin_user)

        workflow = Workflow.objects.create(
            name="Ready-to-Sequence PacBio",
            structure="Ready-to-Sequence PacBio",
            created_by_id=admin_user.id, updated_by_id=admin_user.id
        )
        reversion.add_to_revision(workflow)

        next_step_order = StepOrder.objects.create(
            step=experiment_run_step,
            order=3,
            workflow=workflow,
            created_by_id=admin_user.id, updated_by_id=admin_user.id
        )
        reversion.add_to_revision(next_step_order)

        normalization_and_pooling_step = Step.objects.get(
            name="Normalization and Pooling (Experiment Run)"
        )
        next_step_order = StepOrder.objects.create(
            step=normalization_and_pooling_step,
            next_step_order=next_step_order,
            order=2,
            workflow=workflow,
            created_by_id=admin_user.id, updated_by_id=admin_user.id
        )
        reversion.add_to_revision(next_step_order)

        library_qc_step = Step.objects.get(
            name="Library QC"
        )
        next_step_order = StepOrder.objects.create(
            step=library_qc_step,
            next_step_order=next_step_order,
            order=1,
            workflow=workflow,
            created_by_id=admin_user.id, updated_by_id=admin_user.id
        )
        reversion.add_to_revision(next_step_order)

def create_pacbio_library_types(apps, schema_editor):
    LibraryType = apps.get_model("fms_core", "LibraryType")
    
    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create PacBio library types.")
        reversion.set_user(admin_user)

        pacbio_library_types = [
            "Kinnex_Full-length_RNA",
            "IsoSeq_RNA",
        ]

        for library_type_name in pacbio_library_types:
            library_type = LibraryType.objects.create(
                name=library_type_name,
                created_by_id=admin_user_id, updated_by_id=admin_user_id
            )
            reversion.add_to_revision(library_type)

def create_qc_instruments(apps, schema_editor):
    InstrumentType = apps.get_model("fms_core", "InstrumentType")
    Platform = apps.get_model("fms_core", "Platform")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        
        reversion.set_comment(f"Create Femto Pulse QC instrument.")
        reversion.set_user(admin_user)

        platform = Platform.objects.get(name="Quality Control")
        instrument_type = InstrumentType.objects.create(
            platform=platform,
            type="Femto Pulse",
            created_by_id=admin_user.id, updated_by_id=admin_user.id
        )
        reversion.add_to_revision(instrument_type)

def create_ffpe_sample_kind(apps, schema_editor):
    SampleKind = apps.get_model('fms_core', 'SampleKind')

    with reversion.create_revision():
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        reversion.set_user(admin_user)
        reversion.set_comment("Create FFPE sample kind.")

        ffpe_sample_kind = SampleKind.objects.create(
            name='FFPE',
            is_extracted=False,
            created_by_id=admin_user.id,
            updated_by_id=admin_user.id
        )
        ffpe_sample_kind.save()
        reversion.add_to_revision(ffpe_sample_kind)

def create_default_profile(apps, schema_editor):
    User = get_user_model()
    Profile = apps.get_model('fms_core', 'Profile')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create default profile.")
        reversion.set_user(admin_user)

        default_profile = Profile.objects.create(
            name='Default',
            parent=None,
            preferences={
                "table.sample.page-limit": 100,
            },
            created_by_id=admin_user.id,
            updated_by_id=admin_user.id,
        )
        reversion.add_to_revision(default_profile)        

def create_freezeman_users(apps, schema_editor):
    Profile = apps.get_model('fms_core', 'Profile')
    FreezemanUser = apps.get_model('fms_core', 'FreezemanUser')

    default_profile = Profile.objects.get(name='Default')

    with reversion.create_revision(manage_manually=True):
        User = get_user_model()
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create FreezemanUser for all existing users.")
        reversion.set_user(admin_user)

        for user in User.objects.all():
            fm_user = FreezemanUser.objects.create(
                user_id=user.id,
                profile=default_profile,
                created_by_id=admin_user.id,
                updated_by_id=admin_user.id,
            )
            reversion.add_to_revision(fm_user)

class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0071_v5_2_0'),
    ]

    operations = [
        migrations.RunPython(create_pacbio_revio_instrument, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_pacbio_experiment_run_step, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_pacbio_ready_to_sequence_workflow, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_pacbio_library_types, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_qc_instruments, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_ffpe_sample_kind, reverse_code=migrations.RunPython.noop),
        migrations.AddField(
            model_name='index',
            name='external_name',
            field=models.CharField(blank=True, help_text='The fabricator given name of the index. Used internally by the instrument.', max_length=200, null=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))]),
        ),
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('axiom 96-format array pmra', 'axiom 96-format array pmra'), ('axiom 96-format array ukbb', 'axiom 96-format array ukbb'), ('infinium epic 8 beadchip', 'infinium epic 8 beadchip'), ('infinium gs 24 beadchip', 'infinium gs 24 beadchip'), ('dnbseq-g400 flowcell', 'dnbseq-g400 flowcell'), ('dnbseq-t7 flowcell', 'dnbseq-t7 flowcell'), ('illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-1.5b flowcell'), ('illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-10b flowcell'), ('illumina-novaseq-x-25b flowcell', 'illumina-novaseq-x-25b flowcell'), ('illumina-novaseq-sp flowcell', 'illumina-novaseq-sp flowcell'), ('illumina-novaseq-s1 flowcell', 'illumina-novaseq-s1 flowcell'), ('illumina-novaseq-s2 flowcell', 'illumina-novaseq-s2 flowcell'), ('illumina-novaseq-s4 flowcell', 'illumina-novaseq-s4 flowcell'), ('illumina-miseq-v2 flowcell', 'illumina-miseq-v2 flowcell'), ('illumina-miseq-v3 flowcell', 'illumina-miseq-v3 flowcell'), ('illumina-miseq-micro flowcell', 'illumina-miseq-micro flowcell'), ('illumina-miseq-nano flowcell', 'illumina-miseq-nano flowcell'), ('illumina-iseq-100 flowcell', 'illumina-iseq-100 flowcell'), ('pacbio-revio smrt cell tray', 'pacbio-revio smrt cell tray'), ('tube', 'tube'), ('tube strip 2x1', 'tube strip 2x1'), ('tube strip 3x1', 'tube strip 3x1'), ('tube strip 4x1', 'tube strip 4x1'), ('tube strip 5x1', 'tube strip 5x1'), ('tube strip 6x1', 'tube strip 6x1'), ('tube strip 7x1', 'tube strip 7x1'), ('tube strip 8x1', 'tube strip 8x1'), ('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'), ('tube box 3x3', 'tube box 3x3'), ('tube box 6x6', 'tube box 6x6'), ('tube box 7x7', 'tube box 7x7'), ('tube box 8x8', 'tube box 8x8'), ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'), ('tube box 21x10', 'tube box 21x10'), ('tube rack 4x6', 'tube rack 4x6'), ('tube rack 8x12', 'tube rack 8x12'), ('box', 'box'), ('drawer', 'drawer'), ('freezer rack 2x4', 'freezer rack 2x4'), ('freezer rack 3x4', 'freezer rack 3x4'), ('freezer rack 4x4', 'freezer rack 4x4'), ('freezer rack 4x6', 'freezer rack 4x6'), ('freezer rack 5x4', 'freezer rack 5x4'), ('freezer rack 6x4', 'freezer rack 6x4'), ('freezer rack 7x4', 'freezer rack 7x4'), ('freezer rack 10x5', 'freezer rack 10x5'), ('freezer rack 8x6', 'freezer rack 8x6'), ('freezer rack 11x6', 'freezer rack 11x6'), ('freezer rack 16x6', 'freezer rack 16x6'), ('freezer rack 11x7', 'freezer rack 11x7'), ('freezer 3 shelves', 'freezer 3 shelves'), ('freezer 4 shelves', 'freezer 4 shelves'), ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room'), ('site', 'site')], help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.', max_length=40),
        ),
        migrations.AlterField(
            model_name='experimentrun',
            name='container',
            field=models.OneToOneField(help_text='Container', limit_choices_to={'kind__in': ('axiom 96-format array pmra', 'axiom 96-format array ukbb', 'infinium epic 8 beadchip', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-25b flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-iseq-100 flowcell', 'pacbio-revio smrt cell tray')}, on_delete=django.db.models.deletion.PROTECT, related_name='experiment_run', to='fms_core.container'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='container',
            field=models.ForeignKey(help_text='Container in which the sample is placed.', limit_choices_to={'kind__in': ('axiom 96-format array pmra', 'axiom 96-format array ukbb', 'infinium epic 8 beadchip', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-25b flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-iseq-100 flowcell', 'pacbio-revio smrt cell tray', 'tube', 'tube strip 2x1', 'tube strip 3x1', 'tube strip 4x1', 'tube strip 5x1', 'tube strip 6x1', 'tube strip 7x1', 'tube strip 8x1', '96-well plate', '384-well plate')}, on_delete=django.db.models.deletion.PROTECT, related_name='samples', to='fms_core.container'),
        ),
        migrations.AlterField(
            model_name='sampleidentitymatch',
            name='matched',
            field=models.ForeignKey(help_text='Match found to be referencing this sample identity.', on_delete=django.db.models.deletion.PROTECT, related_name='matched_identity_match', to='fms_core.sampleidentity'),
        ),
        migrations.AlterField(
            model_name='stephistory',
            name='workflow_action',
            field=models.CharField(choices=[('NEXT_STEP', 'Step complete - Move to next step'), ('DEQUEUE_SAMPLE', 'Sample failed - Remove sample from study workflow'), ('REPEAT_STEP', 'Repeat step - Move to next step and repeat current step'), ('REPEAT_QC_STEP', 'Repeat QC step - Repeat current QC step'), ('IGNORE_WORKFLOW', 'Ignore workflow - Do not register as part of a workflow')], default='NEXT_STEP', help_text='Workflow action that was performed on the sample after step completion.', max_length=30),
        ),

        migrations.CreateModel(
            name='Profile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))])),
                ('preferences', models.JSONField(default=dict, help_text='Preferences stored as a JSON object')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_creation', to=settings.AUTH_USER_MODEL)),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='children', to='fms_core.profile')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='FreezemanUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_creation', to=settings.AUTH_USER_MODEL)),
                ('profile', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='freezeman_users', to='fms_core.profile')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name='freezeman_user', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.RunPython(create_default_profile, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_freezeman_users, reverse_code=migrations.RunPython.noop),
    ]