import reversion
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
from fms_core.models._constants import SampleType


ADMIN_USERNAME = 'biobankadmin'

UNKNOWN_INDEX_NAME = "UNKNOWN_INDEX"
def create_empty_index(apps, schema_editor):
    Index = apps.get_model("fms_core", "Index")
    IndexStructure = apps.get_model("fms_core", "IndexStructure")
    Sequence = apps.get_model("fms_core", "Sequence")

    NO_FLANKERS_INDEX_STRUCTURE_NAME = "No_Flankers"

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create index '{UNKNOWN_INDEX_NAME}' and its structure '{NO_FLANKERS_INDEX_STRUCTURE_NAME}'.")
        reversion.set_user(admin_user)

        # Create empty sequence
        empty_sequence, _ = Sequence.objects.get_or_create(value="",
                                                           defaults={"created_by_id": admin_user.id, "updated_by_id": admin_user.id})

        # Create index structure with no flankers
        index_structure = IndexStructure.objects.create(
            name=NO_FLANKERS_INDEX_STRUCTURE_NAME,
            flanker_5prime_forward=empty_sequence,
            flanker_5prime_reverse=empty_sequence,
            flanker_3prime_forward=empty_sequence,
            flanker_3prime_reverse=empty_sequence,
            created_by_id=admin_user.id,
            updated_by_id=admin_user.id
        )

        # Create index
        index = Index.objects.create(name=UNKNOWN_INDEX_NAME, index_structure=index_structure,
                                     created_by_id=admin_user.id, updated_by_id=admin_user.id)

        reversion.add_to_revision(empty_sequence)
        reversion.add_to_revision(index_structure)
        reversion.add_to_revision(index)

def create_olink_index_set(apps, schema_editor):
    IndexSet = apps.get_model("fms_core", "IndexSet")
    IndexBySet = apps.get_model("fms_core", "IndexBySet")
    Index = apps.get_model("fms_core", "Index")

    OLINK_INDEX_SET = "Olink_Default_Index_Set"
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create index set '{OLINK_INDEX_SET}' for Olink library types.")
        reversion.set_user(admin_user)

        # Create set
        index_set = IndexSet.objects.create(name=OLINK_INDEX_SET, created_by_id=admin_user.id, updated_by_id=admin_user.id)
        reversion.add_to_revision(index_set)

        # Create IndexBySet
        index = Index.objects.get(name=UNKNOWN_INDEX_NAME)  # Assuming create_empty_index function has already run
        index_by_set = IndexBySet.objects.create(index=index, index_set=index_set,
                                                 created_by_id=admin_user.id, updated_by_id=admin_user.id)
        reversion.add_to_revision(index_by_set)

def create_olink_library_types(apps, schema_editor):
    NEW_LIBRARY_TYPE_NAMES = ["Olink_Explore_HT",
                              "Olink_Explore_3072",
                              "Olink_Explore_384",
                              "Olink_Reveal"]
    
    LibraryType = apps.get_model("fms_core", "LibraryType")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Add new library types to be supported for ready to sequence.")
        reversion.set_user(admin_user)
    
        for library_name in NEW_LIBRARY_TYPE_NAMES:
            library_type = LibraryType.objects.create(name=library_name,
                                                      created_by_id=admin_user.id,
                                                      updated_by_id=admin_user.id)
            reversion.add_to_revision(library_type)

def selection_and_selection_targets_for_olink(apps, schema_editor):
    LibrarySelection = apps.get_model("fms_core", "LibrarySelection")

    SELECTION_NAME = "Olink_Explore_Panel"
    SELECTION_TARGETS = [
        "Cardiometabolic",
        "Cardiometabolic II",
        "Inflammation",
        "Inflammation II",
        "Neurology",
        "Neurology II",
        "Oncology",
        "Oncology II",
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment("Add library selection and targets for Olink library types.")
        reversion.set_user(admin_user)

        # Create LibrarySelections for Olink
        for target in SELECTION_TARGETS:
            olink_selection = LibrarySelection.objects.create(
                name=SELECTION_NAME,
                target=target,
                created_by_id=admin_user.id,
                updated_by_id=admin_user.id
            )
            reversion.add_to_revision(olink_selection)

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
        ('fms_core', '0069_v5_0_0'),
    ]

    operations = [
        migrations.RunPython(create_empty_index, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_olink_index_set, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_olink_library_types, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(selection_and_selection_targets_for_olink, reverse_code=migrations.RunPython.noop),
        migrations.AddField(
            model_name='samplenextstep',
            name='block_count',
            field=models.PositiveIntegerField(default=0, help_text='Number of sample workflow blocking triggers.'),
        ),
        migrations.AlterField(
            model_name='stephistory',
            name='workflow_action',
            field=models.CharField(choices=[('NEXT_STEP', 'Step complete - Move to next step'), ('DEQUEUE_SAMPLE', 'Sample failed - Remove sample from study workflow'), ('REPEAT_STEP', 'Repeat step - Move to next step and repeat current step'), ('IGNORE_WORKFLOW', 'Ignore workflow - Do not register as part of a workflow'), ('BLOCK_AT_NEXT_STEP', 'Step partially complete - Move to next step and wait for completion')], default='NEXT_STEP', help_text='Workflow action that was performed on the sample after step completion.', max_length=30),
        ),
        migrations.CreateModel(
            name='SampleIdentity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('predicted_sex', models.CharField(blank=True, choices=[('M', 'M'), ('F', 'F'), ('Unknown', 'Unknown')], help_text='Sex of the sample.', max_length=10, null=True)),
                ('passed_qc', models.BooleanField(default=False, help_text='Flag indicating if the identity qc was conclusive.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.RunPython(add_identity_qc_step, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(initialize_workflows_with_id_check, reverse_code=migrations.RunPython.noop),
    ]
