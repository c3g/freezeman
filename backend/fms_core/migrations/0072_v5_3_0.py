import reversion
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
from fms_core.models._constants import INDEX_READ_FORWARD, SampleType


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
            name="PACBIO_SMRT",
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(platform)

        instrument_type, _ = InstrumentType.create(
            platform=platform,
            type="Revio",
            index_read_5_prime=INDEX_READ_FORWARD,
            index_read_3_prime=INDEX_READ_FORWARD,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(instrument_type)

        instrument, _ = Instrument.objects.create(
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

        protocol, _ = Protocol.objects.create(
            name="PacBio Preparation",
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(protocol)

        platform = Platform.objects.get(name="PACBIO_SMRT")
        run_type = RunType.objects.create(
            name="Pacbio",
            platform=platform,
            protcol=protocol,
            needs_run_processing=False,
            craeted_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(run_type)

        protocol_content_type = ContentType.objects.get_for_model(Protocol)
        PROPERTY_TYPE_NAMES = [
            "Loading Concentration",
            "Run Time",
            "Sequencing Kit Lot",
            "Sequencing Side",
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

        Step.objects.create(
            name=PACBIO_EXPERIMENT_RUN_STEP_NAME,
            protocol=protocol,
            sample_type=SampleType.LIBRARY,
            is_active=True,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(Step)

def create_pacbio_ready_to_sequence_workflow(apps, schema_editor):
    Workflow = apps.get_model("fms_core", "Workflow")
    Step = apps.get_model("fms_core", "Step")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    experiment_run_step = Step.objects.get(name=PACBIO_EXPERIMENT_RUN_STEP_NAME)

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create workflow for PacBio ready to sequence.")
        reversion.set_user(admin_user)

        workflow, _ = Workflow.objects.create(
            name="Ready-to-Sequence PacBio",
            structure="Ready-to-Sequence PacBio",
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(workflow)

        next_step_order = StepOrder.objects.create(
            step=experiment_run_step,
            order=4,
            workflow=workflow,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(next_step_order)

        normalization_and_pooling_step = Step.objects.get(
            name="Normalization and Pooling"
        )
        next_step_order = StepOrder.objects.create(
            step=normalization_and_pooling_step,
            next_step_order=next_step_order,
            order=3,
            workflow=workflow,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(next_step_order)

        library_qc_step = Step.objects.get(
            name="Library QC"
        )
        next_step_order = StepOrder.objects.create(
            step=library_qc_step,
            next_step_order=next_step_order,
            order=2,
            workflow=workflow,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(next_step_order)
        
        transfer_for_library_qc_step = Step.objects.get(
            name="Transfer for library QC"
        )
        next_step_order = StepOrder.objects.create(
            step=transfer_for_library_qc_step,
            next_step_order=next_step_order,
            order=1,
            workflow=workflow,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(next_step_order)
        
class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0071_v5_2_0'),
    ]

    operations = [
        migrations.RunPython(create_pacbio_revio_instrument, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_pacbio_experiment_run_step, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_pacbio_ready_to_sequence_workflow, reverse_code=migrations.RunPython.noop),
    ]