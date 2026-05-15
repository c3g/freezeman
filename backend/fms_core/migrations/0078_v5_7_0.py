import re
import reversion

from django.conf import settings
from django.contrib.auth import get_user_model
import django.core.validators
from django.db import migrations, models

from fms_core.models._constants import INDEX_READ_FORWARD, SampleType, StepType


ADMIN_USERNAME = 'biobankadmin'

ULTIMA_PLATFORM = "ULTIMA_GENOMICS"
ULTIMA_INSTRUMENT_TYPE = "Ultima Genomics UG100"
ULTIMA_INSTRUMENT_NAME = "Ultima UG100"
ULTIMA_INSTRUMENT_SERIAL_NUMBER = "V150"
ULTIMA_EXPERIMENT_RUN_STEP_NAME = "Ultima Experiment Run"
ULTIMA_RUN_TYPE = "Ultima"

def create_ultima_platform(apps, schema_editor):
    Platform = apps.get_model("fms_core", "Platform")
    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create platform for Ultima Genomics.")
        reversion.set_user(admin_user)

        platform = Platform.objects.create(name=ULTIMA_PLATFORM, created_by_id=admin_user_id, updated_by_id=admin_user_id)
        reversion.add_to_revision(platform)

def create_ultima_instrument(apps, schema_editor):
    Instrument = apps.get_model("fms_core", "Instrument")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")
    Platform = apps.get_model("fms_core", "Platform")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create instrument for Ultima Genomics.")
        reversion.set_user(admin_user)

        platform = Platform.objects.get(name=ULTIMA_PLATFORM)

        instrument_type = InstrumentType.objects.create(
            platform=platform,
            type=ULTIMA_INSTRUMENT_TYPE,
            index_read_5_prime=INDEX_READ_FORWARD,
            index_read_3_prime=INDEX_READ_FORWARD,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(instrument_type)

        instrument = Instrument.objects.create(
            name=ULTIMA_INSTRUMENT_NAME,
            type=instrument_type,
            serial_id=ULTIMA_INSTRUMENT_SERIAL_NUMBER,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(instrument)

def create_ultima_experiment_run_step(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Protocol = apps.get_model("fms_core", "Protocol")
    Platform = apps.get_model("fms_core", "Platform")
    RunType = apps.get_model("fms_core", "RunType")
    ContentType = apps.get_model('contenttypes', 'ContentType')
    PropertyType = apps.get_model("fms_core", "PropertyType")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create step for Ultima Experiment Run.")
        reversion.set_user(admin_user)

        protocol = Protocol.objects.create(
            name="Ultima Preparation",
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(protocol)

        platform = Platform.objects.get(name=ULTIMA_PLATFORM)
        run_type = RunType.objects.create(
            name=ULTIMA_RUN_TYPE,
            platform=platform,
            protocol=protocol,
            needs_run_processing=True,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(run_type)

        protocol_content_type = ContentType.objects.get_for_model(Protocol)
        PROPERTY_TYPE_NAMES = [
            "Loading Concentration (pM)",
            "Application",
            "Sequencing Kit Lot",
            "Wafer Lot"
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
            name=ULTIMA_EXPERIMENT_RUN_STEP_NAME,
            protocol=protocol,
            type=StepType.PROTOCOL,
            expected_sample_type=SampleType.LIBRARY,
            needs_placement=True,
            needs_planning=False,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(step)

def create_ultima_ready_to_sequence_workflow(apps, schema_editor):
    Workflow = apps.get_model("fms_core", "Workflow")
    Step = apps.get_model("fms_core", "Step")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    experiment_run_step = Step.objects.get(name=ULTIMA_EXPERIMENT_RUN_STEP_NAME)

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"Create workflow for Ultima ready to sequence.")
        reversion.set_user(admin_user)

        workflow = Workflow.objects.create(
            name="Ready-to-Sequence Ultima",
            structure="Ready-to-Sequence Ultima",
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

def create_ultima_library_types(apps, schema_editor):
    LibraryType = apps.get_model("fms_core", "LibraryType")
    
    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create Ultima library types.")
        reversion.set_user(admin_user)

        ultima_library_types = [
            "EM-Seq",
            "WGS_ppmSeq",
        ]

        for library_type_name in ultima_library_types:
            library_type = LibraryType.objects.create(
                name=library_type_name,
                created_by_id=admin_user_id, updated_by_id=admin_user_id
            )
            reversion.add_to_revision(library_type)


class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0077_v5_6_0'),
    ]

    operations = [
        migrations.RunPython(create_ultima_platform, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_ultima_instrument, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_ultima_experiment_run_step, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_ultima_ready_to_sequence_workflow, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_ultima_library_types, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('axiom 96-format array pmra', 'axiom 96-format array pmra'), ('axiom 96-format array ukbb', 'axiom 96-format array ukbb'), ('infinium epic 8 beadchip', 'infinium epic 8 beadchip'), ('infinium gs 24 beadchip', 'infinium gs 24 beadchip'), ('dnbseq-g400 flowcell', 'dnbseq-g400 flowcell'), ('dnbseq-t7 flowcell', 'dnbseq-t7 flowcell'), ('illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-1.5b flowcell'), ('illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-10b flowcell'), ('illumina-novaseq-x-25b flowcell', 'illumina-novaseq-x-25b flowcell'), ('illumina-novaseq-sp flowcell', 'illumina-novaseq-sp flowcell'), ('illumina-novaseq-s1 flowcell', 'illumina-novaseq-s1 flowcell'), ('illumina-novaseq-s2 flowcell', 'illumina-novaseq-s2 flowcell'), ('illumina-novaseq-s4 flowcell', 'illumina-novaseq-s4 flowcell'), ('illumina-miseq-v2 flowcell', 'illumina-miseq-v2 flowcell'), ('illumina-miseq-v3 flowcell', 'illumina-miseq-v3 flowcell'), ('illumina-miseq-micro flowcell', 'illumina-miseq-micro flowcell'), ('illumina-miseq-nano flowcell', 'illumina-miseq-nano flowcell'), ('illumina-iseq-100 flowcell', 'illumina-iseq-100 flowcell'), ('pacbio-revio smrt cell tray', 'pacbio-revio smrt cell tray'), ('ultima wafer', 'ultima wafer'), ('tube', 'tube'), ('tube strip 2x1', 'tube strip 2x1'), ('tube strip 3x1', 'tube strip 3x1'), ('tube strip 4x1', 'tube strip 4x1'), ('tube strip 5x1', 'tube strip 5x1'), ('tube strip 6x1', 'tube strip 6x1'), ('tube strip 7x1', 'tube strip 7x1'), ('tube strip 8x1', 'tube strip 8x1'), ('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'), ('tube box 3x3', 'tube box 3x3'), ('tube box 6x6', 'tube box 6x6'), ('tube box 7x7', 'tube box 7x7'), ('tube box 8x8', 'tube box 8x8'), ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'), ('tube box 21x10', 'tube box 21x10'), ('tube rack 4x6', 'tube rack 4x6'), ('tube rack 8x12', 'tube rack 8x12'), ('box', 'box'), ('drawer', 'drawer'), ('freezer rack 2x4', 'freezer rack 2x4'), ('freezer rack 3x4', 'freezer rack 3x4'), ('freezer rack 4x4', 'freezer rack 4x4'), ('freezer rack 4x6', 'freezer rack 4x6'), ('freezer rack 5x4', 'freezer rack 5x4'), ('freezer rack 6x4', 'freezer rack 6x4'), ('freezer rack 7x4', 'freezer rack 7x4'), ('freezer rack 10x5', 'freezer rack 10x5'), ('freezer rack 8x6', 'freezer rack 8x6'), ('freezer rack 11x6', 'freezer rack 11x6'), ('freezer rack 16x6', 'freezer rack 16x6'), ('freezer rack 11x7', 'freezer rack 11x7'), ('freezer 3 shelves', 'freezer 3 shelves'), ('freezer 4 shelves', 'freezer 4 shelves'), ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room'), ('site', 'site')], help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.', max_length=40),
        ),
        migrations.AlterField(
            model_name='experimentrun',
            name='container',
            field=models.OneToOneField(help_text='Container', limit_choices_to={'kind__in': ('axiom 96-format array pmra', 'axiom 96-format array ukbb', 'infinium epic 8 beadchip', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-25b flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-iseq-100 flowcell', 'pacbio-revio smrt cell tray', 'ultima wafer')}, on_delete=django.db.models.deletion.PROTECT, related_name='experiment_run', to='fms_core.container'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='container',
            field=models.ForeignKey(help_text='Container in which the sample is placed.', limit_choices_to={'kind__in': ('axiom 96-format array pmra', 'axiom 96-format array ukbb', 'infinium epic 8 beadchip', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-25b flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-iseq-100 flowcell', 'pacbio-revio smrt cell tray', 'ultima wafer', 'tube', 'tube strip 2x1', 'tube strip 3x1', 'tube strip 4x1', 'tube strip 5x1', 'tube strip 6x1', 'tube strip 7x1', 'tube strip 8x1', '96-well plate', '384-well plate')}, on_delete=django.db.models.deletion.PROTECT, related_name='samples', to='fms_core.container'),
        ),
    ]