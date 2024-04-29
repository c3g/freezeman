import reversion
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def redefine_current_pooling_step(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Replace the pooling step by a limited pooling step for before running the experiment.")
        reversion.set_user(admin_user)

        step = Step.objects.get(name="Normalization and Pooling")
        # Rename step
        step.name = "Normalization and Pooling (Experiment Run)"
        step.save()
        reversion.add_to_revision(step)
        
        # Add specification to step
        step_specification  = StepSpecification.objects.create(name="PoolingType",
                                                               step_id=step.id,
                                                               sheet_name="SamplesToPool",
                                                               column_name="Type",
                                                               value="Experiment Run",
                                                               created_by_id=admin_user.id,
                                                               updated_by_id=admin_user.id)
        reversion.add_to_revision(step_specification)

def add_new_pooling_steps(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Protocol = apps.get_model("fms_core", "Protocol")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")

    STEPS = [
        # {name, protocol_name, specifications}
        {"name": "Normalization and Pooling (Capture MCC)", "protocol_name": "Sample Pooling", "expected_sample_type": "LIBRARY",
         "specifications": [{"name": "PoolingType", "sheet_name": "SamplesToPool", "column_name": "Type", "value": "Capture MCC"}]},
        {"name": "Normalization and Pooling (Capture Exome)", "protocol_name": "Sample Pooling", "expected_sample_type": "LIBRARY",
         "specifications": [{"name": "PoolingType", "sheet_name": "SamplesToPool", "column_name": "Type", "value": "Capture Exome"}]},
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Create pooling steps for before running the captures.")
        reversion.set_user(admin_user)

        for step_definition in STEPS:
            protocol = Protocol.objects.get(name=step_definition["protocol_name"])
            step = Step.objects.create(name=step_definition["name"],
                                       protocol_id=protocol.id,
                                       type="PROTOCOL",
                                       needs_placement=False,
                                       needs_planning=True,
                                       expected_sample_type=step_definition["expected_sample_type"],
                                       created_by_id=admin_user.id,
                                       updated_by_id=admin_user.id)
            reversion.add_to_revision(step)
            for step_specification in step_definition["specifications"]:
                step_specification = StepSpecification.objects.create(name=step_specification["name"],
                                                                      step_id=step.id,
                                                                      sheet_name=step_specification["sheet_name"],
                                                                      column_name=step_specification["column_name"],
                                                                      value=step_specification["value"],
                                                                      created_by_id=admin_user.id,
                                                                      updated_by_id=admin_user.id)
                reversion.add_to_revision(step_specification)

def replace_steps_in_existing_workflows(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    StepOrder = apps.get_model("fms_core", "StepOrder")
    SampleNextStep = apps.get_model("fms_core", "SampleNextStep")

    # 2 current workflow step orders are required to be changed from Experiment Run to Capture
    WORFLOW_STEP_ORDER_CHANGES = [
        {"workflow_name": "WGBS Capture MCC Illumina", "order": 7, "replacement_step_name": "Normalization and Pooling (Capture MCC)"},
        {"workflow_name": "PCR-enriched Capture Exome Illumina", "order": 7, "replacement_step_name": "Normalization and Pooling (Capture Exome)"},
    ]
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Change step orders of capture pooling steps to reference the new steps.")
        reversion.set_user(admin_user)

        for changed_step_order in WORFLOW_STEP_ORDER_CHANGES:
            # Modify the step order
            replacement_step = Step.objects.get(name=changed_step_order["replacement_step_name"])
            step_order = StepOrder.objects.get(workflow__name=changed_step_order["workflow_name"], order=changed_step_order["order"])
            step_order.step_id = replacement_step.id
            step_order.save()
            reversion.add_to_revision(step_order)
            
            # Replace step in sample_next_steps for samples queued to studies
            sample_next_steps = SampleNextStep.objects.filter(sample_next_step_by_study__step_order_id=step_order.id)
            for sample_next_step in sample_next_steps.all():
                sample_next_step.step_id = replacement_step.id
                sample_next_step.save()
                reversion.add_to_revision(sample_next_step)

def add_needs_planning_to_normalization_steps(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Modify normalization steps needs_planning attribute to True.")
        reversion.set_user(admin_user)

        steps = Step.objects.filter(protocol__name="Normalization")
        for step in steps.all():
            step.needs_planning = True
            step.save()
            reversion.add_to_revision(step)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0061_v4_8_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='step',
            name='needs_planning',
            field=models.BooleanField(default=False, help_text='Step has a planning template to fill before the main template.'),
        ),
        migrations.RunPython(
            redefine_current_pooling_step,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            add_new_pooling_steps,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            replace_steps_in_existing_workflows,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            add_needs_planning_to_normalization_steps,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('axiom 96-format array pmra', 'axiom 96-format array pmra'), ('axiom 96-format array ukbb', 'axiom 96-format array ukbb'), ('infinium gs 24 beadchip', 'infinium gs 24 beadchip'), ('dnbseq-g400 flowcell', 'dnbseq-g400 flowcell'), ('dnbseq-t7 flowcell', 'dnbseq-t7 flowcell'), ('illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-1.5b flowcell'), ('illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-10b flowcell'), ('illumina-novaseq-x-25b flowcell', 'illumina-novaseq-x-25b flowcell'), ('illumina-novaseq-sp flowcell', 'illumina-novaseq-sp flowcell'), ('illumina-novaseq-s1 flowcell', 'illumina-novaseq-s1 flowcell'), ('illumina-novaseq-s2 flowcell', 'illumina-novaseq-s2 flowcell'), ('illumina-novaseq-s4 flowcell', 'illumina-novaseq-s4 flowcell'), ('illumina-miseq-v2 flowcell', 'illumina-miseq-v2 flowcell'), ('illumina-miseq-v3 flowcell', 'illumina-miseq-v3 flowcell'), ('illumina-miseq-micro flowcell', 'illumina-miseq-micro flowcell'), ('illumina-miseq-nano flowcell', 'illumina-miseq-nano flowcell'), ('illumina-iseq-100 flowcell', 'illumina-iseq-100 flowcell'), ('tube', 'tube'), ('tube strip 2x1', 'tube strip 2x1'), ('tube strip 3x1', 'tube strip 3x1'), ('tube strip 4x1', 'tube strip 4x1'), ('tube strip 5x1', 'tube strip 5x1'), ('tube strip 6x1', 'tube strip 6x1'), ('tube strip 7x1', 'tube strip 7x1'), ('tube strip 8x1', 'tube strip 8x1'), ('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'), ('tube box 3x3', 'tube box 3x3'), ('tube box 6x6', 'tube box 6x6'), ('tube box 7x7', 'tube box 7x7'), ('tube box 8x8', 'tube box 8x8'), ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'), ('tube box 21x10', 'tube box 21x10'), ('tube rack 4x6', 'tube rack 4x6'), ('tube rack 8x12', 'tube rack 8x12'), ('box', 'box'), ('drawer', 'drawer'), ('freezer rack 2x4', 'freezer rack 2x4'), ('freezer rack 3x4', 'freezer rack 3x4'), ('freezer rack 4x4', 'freezer rack 4x4'), ('freezer rack 4x6', 'freezer rack 4x6'), ('freezer rack 5x4', 'freezer rack 5x4'), ('freezer rack 6x4', 'freezer rack 6x4'), ('freezer rack 7x4', 'freezer rack 7x4'), ('freezer rack 10x5', 'freezer rack 10x5'), ('freezer rack 8x6', 'freezer rack 8x6'), ('freezer rack 11x6', 'freezer rack 11x6'), ('freezer rack 16x6', 'freezer rack 16x6'), ('freezer rack 11x7', 'freezer rack 11x7'), ('freezer 3 shelves', 'freezer 3 shelves'), ('freezer 4 shelves', 'freezer 4 shelves'), ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room'), ('site', 'site')], help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.', max_length=40),
        ),
    ]
