import reversion
from django.db import migrations
from django.contrib.auth.models import User
from fms_core.models._constants import INDEX_READ_FORWARD, SampleType, StepType

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
        admin_user = User.objects.get(username=ADMIN_USERNAME)
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
            "Sequencing Kit Lot",
            "Sequencer Side",
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
        admin_user = User.objects.get(username=ADMIN_USERNAME)

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
        admin_user = User.objects.get(username=ADMIN_USERNAME)
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
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        
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
        admin_user = User.objects.get(username=ADMIN_USERNAME)
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
    ]