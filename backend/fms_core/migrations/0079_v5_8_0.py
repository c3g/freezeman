import reversion

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import migrations, models

from fms_core.models._constants import SampleType, StepType


ADMIN_USERNAME = 'biobankadmin'

ILLUMINA_PLATFORM = "ILLUMINA"
ILLUMINA_EXPERIMENT_RUN_STEP_NAME = "Experiment Run Illumina"
SAMPLE_QC_BIOSPECIMEN_STEP = "Sample QC (Biospecimen)"
NORMALIZATION_BIOSPECIMEN_STEP = "Normalization (Biospecimen)"
LIBRARY_PREPARATION_WITH_SELECTION_STEP  = "Library Preparation (PCR-enriched, Phage Display, Illumina)"

def create_biospecimen_sample_QC_step(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")
    Protocol = apps.get_model("fms_core", "Protocol")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create a sample qc step for biospecimens.")
        reversion.set_user(admin_user)

        protocol = Protocol.objects.get(name="Sample Quality Control")
        
        step = Step.objects.create(
            name=SAMPLE_QC_BIOSPECIMEN_STEP,
            protocol=protocol,
            type=StepType.PROTOCOL,
            expected_sample_type=SampleType.UNEXTRACTED_SAMPLE,
            needs_placement=True,
            needs_planning=False,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(step)

        step_specification = StepSpecification.objects.create(name="SampleQcType",
                                                              step_id=step.id,
                                                              sheet_name="SampleQC",
                                                              column_name="Sample Kind",
                                                              value="Biospecimen",
                                                              created_by_id=admin_user_id,
                                                              updated_by_id=admin_user_id)
        reversion.add_to_revision(step_specification)

def create_biospecimen_normalization_step(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")
    Protocol = apps.get_model("fms_core", "Protocol")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create a normalization step for biospecimens.")
        reversion.set_user(admin_user)

        protocol = Protocol.objects.get(name="Normalization")
        
        step = Step.objects.create(
            name=NORMALIZATION_BIOSPECIMEN_STEP,
            protocol=protocol,
            type=StepType.PROTOCOL,
            expected_sample_type=SampleType.UNEXTRACTED_SAMPLE,
            needs_placement=True,
            needs_planning=True,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(step)

        step_specification = StepSpecification.objects.create(name="NormalizationType",
                                                              step_id=step.id,
                                                              sheet_name="Normalization",
                                                              column_name="Type",
                                                              value="Biospecimen",
                                                              created_by_id=admin_user_id,
                                                              updated_by_id=admin_user_id)
        reversion.add_to_revision(step_specification)

def create_library_preparation_with_selection_step(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")
    Protocol = apps.get_model("fms_core", "Protocol")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create a library preparation step including a phage display selection.")
        reversion.set_user(admin_user)

        protocol = Protocol.objects.get(name="Library Preparation")
        
        step = Step.objects.create(
            name=LIBRARY_PREPARATION_WITH_SELECTION_STEP,
            protocol=protocol,
            type=StepType.PROTOCOL,
            expected_sample_type=SampleType.SAMPLE,
            needs_placement=True,
            needs_planning=False,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(step)

        step_specification_1 = StepSpecification.objects.create(name="LibraryType",
                                                                step_id=step.id,
                                                                sheet_name="Library Batch",
                                                                column_name="Library Type",
                                                                value="PCR-enriched",
                                                                created_by_id=admin_user_id,
                                                                updated_by_id=admin_user_id)
        reversion.add_to_revision(step_specification_1)

        step_specification_2 = StepSpecification.objects.create(name="SelectionType",
                                                                step_id=step.id,
                                                                sheet_name="Library Batch",
                                                                column_name="Library Selection",
                                                                value="Phage Display",
                                                                created_by_id=admin_user_id,
                                                                updated_by_id=admin_user_id)
        reversion.add_to_revision(step_specification_2)

        step_specification_3 = StepSpecification.objects.create(name="LibraryPlatform",
                                                                step_id=step.id,
                                                                sheet_name="Library Batch",
                                                                column_name="Platform",
                                                                value="ILLUMINA",
                                                                created_by_id=admin_user_id,
                                                                updated_by_id=admin_user_id)
        reversion.add_to_revision(step_specification_3)


def create_phage_display_workflow(apps, schema_editor):
    Workflow = apps.get_model("fms_core", "Workflow")
    Step = apps.get_model("fms_core", "Step")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    WORKFLOWS = [
        # (name, structure, step_names)
        ("Phage Display Illumina", "Phage Display Illumina", ["Sample QC (Biospecimen)", "Normalization (Biospecimen)", "Library Preparation (PCR-enriched, Phage Display, Illumina)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Phage Display)", "Transfer for library QC", "Library QC", "Normalization and Pooling (Experiment Run)", "Experiment Run Illumina"]),   
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create workflows for Phage Display.")
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


def create_phage_library_selections(apps, schema_editor):
    LibrarySelection = apps.get_model("fms_core", "LibrarySelection")

    LIBRARY_SELECTION = [
        # (name, target),
        ("Phage_Display_M13", "MPOX"),
        ("Phage_Display_M13", "Human Proteome"),
        ("Phage_Display_T7", "MPOX"),
        ("Phage_Display_T7", "Human Proteome"),
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create initial library selections options for Phage Display.")
        reversion.set_user(admin_user)

        for name, target in LIBRARY_SELECTION:
            library_selection = LibrarySelection.objects.create(name=name,
                                                                target=target,
                                                                created_by_id=admin_user_id,
                                                                updated_by_id=admin_user_id)
            reversion.add_to_revision(library_selection)


class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0078_v5_7_0'),
    ]

    operations = [
        migrations.RunPython(create_biospecimen_sample_QC_step, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_biospecimen_normalization_step, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_library_preparation_with_selection_step, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_phage_display_workflow, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_phage_library_selections, reverse_code=migrations.RunPython.noop),
    ]