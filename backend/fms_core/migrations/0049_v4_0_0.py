from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import reversion
import re

ADMIN_USERNAME = 'biobankadmin'

def initialize_reference_genomes(apps, schema_editor):
    ReferenceGenome = apps.get_model("fms_core", "ReferenceGenome")
    Taxon = apps.get_model("fms_core", "Taxon")

    REFERENCE_GENOMES = [
        # (Assembly name, synonym, GenBank, RefSeq, ncbi_id, size)
        ("GRCh38.p14", "hg38", "GCA_000001405.29", "GCF_000001405.40", 9606, 3099441038),
        ("GRCh37.p13", "hg19", "GCA_000001405.14", "GCF_000001405.25", 9606, 3101788170),
        ("hs37d5", None, None, None, 9606, 3101788170),
        ("GRCm39", "mm39", "GCA_000001635.9", "GCF_000001635.27", 10090, 2728222451),
        ("GRCm38.p6", "mm10", "GCA_000001635.8", "GCF_000001635.26", 10090, 2730855475),
        ("ASM985889v3", None, "GCA_009858895.3", "GCF_009858895.2", 2697049, 29903),
        ("ASM886v2", None, "GCA_000008865.2", "GCF_000008865.2", 562, 5594605),
        ("ASM584v2", None, "GCA_000005845.2", "GCF_000005845.2", 562, 4641652),
        ("ROS_Cfam_1.0", None, "GCA_014441545.1", "GCF_014441545.1", 9615, 2396858295)
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Add commonly used Reference Genomes.")
        reversion.set_user(admin_user)

        for assembly_name, synonym, genbank_id, refseq_id, taxon_ncbi_id, size in REFERENCE_GENOMES:
            taxon = Taxon.objects.get(ncbi_id=taxon_ncbi_id)

            reference_genome = ReferenceGenome.objects.create(assembly_name=assembly_name,
                                                              synonym=synonym,
                                                              genbank_id=genbank_id,
                                                              refseq_id=refseq_id,
                                                              taxon=taxon,
                                                              size=size,
                                                              created_by_id=admin_user_id,
                                                              updated_by_id=admin_user_id)
            reversion.add_to_revision(reference_genome)

def initialize_workflows(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Protocol = apps.get_model("fms_core", "Protocol")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")
    Workflow = apps.get_model("fms_core", "Workflow")
    StepOrder = apps.get_model("fms_core", "StepOrder")

    STEPS = [
        # {name, protocol_name, specifications}
        {"name": "Extraction (DNA)", "protocol_name": "Extraction",
         "specifications": [{"display_name": "Extraction Type", "sheet_name": "ExtractionTemplate", "column_name": "Extraction Type", "value": "DNA"}]},
        {"name": "Extraction (RNA)", "protocol_name": "Extraction",
         "specifications": [{"display_name": "Extraction Type", "sheet_name": "ExtractionTemplate", "column_name": "Extraction Type", "value": "RNA"}]},
        {"name": "Sample QC", "protocol_name": "Sample Quality Control",
         "specifications": []},
        {"name": "Normalization (Sample)", "protocol_name": "Normalization",
         "specifications": [{"display_name": "Normalization Type", "sheet_name": "Normalization", "column_name": "Robot Norm Choice", "value": "Sample Janus"}]},
        {"name": "Normalization (Library)", "protocol_name": "Normalization",
         "specifications": [{"display_name": "Normalization Type", "sheet_name": "Normalization", "column_name": "Robot Norm Choice", "value": "Library"}]},
        {"name": "Library Preparation (PCR-free, Illumina)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "PCR-free"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "ILLUMINA"},]},
        {"name": "Library Preparation (PCR-enriched, Illumina)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "PCR-enriched"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "ILLUMINA"},]},
        {"name": "Library Preparation (RNASeq, Illumina)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "RNASeq"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "ILLUMINA"},]},
        {"name": "Library Preparation (WGBS, Illumina)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "WGBS"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "ILLUMINA"},]},
        {"name": "Library Preparation (16S, Illumina)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "16S"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "ILLUMINA"},]},
        {"name": "Library Preparation (18S, Illumina)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "18S"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "ILLUMINA"},]},
        {"name": "Library Preparation (miRNA, Illumina)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "miRNA"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "ILLUMINA"},]},
        {"name": "Library Preparation (PCR-free, DNBSEQ)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "PCR-free"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "DNBSEQ"},]},
        {"name": "Library Preparation (PCR-enriched, DNBSEQ)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "PCR-enriched"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "DNBSEQ"},]},
        {"name": "Library Preparation (RNASeq, DNBSEQ)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "RNASeq"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "DNBSEQ"},]},
        {"name": "Library Preparation (WGBS, DNBSEQ)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "WGBS"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "DNBSEQ"},]},
        {"name": "Library Preparation (16S, DNBSEQ)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "16S"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "DNBSEQ"},]},
        {"name": "Library Preparation (18S, DNBSEQ)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "18S"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "DNBSEQ"},]},
        {"name": "Library Preparation (miRNA, DNBSEQ)", "protocol_name": "Library Preparation",
         "specifications": [{"display_name": "Library Type", "sheet_name": "Library Batch", "column_name": "Library Type", "value": "miRNA"},
                            {"display_name": "Library Platform", "sheet_name": "Library Batch", "column_name": "Platform", "value": "DNBSEQ"},]},
        {"name": "Library QC", "protocol_name": "Library Quality Control",
         "specifications": []},
        {"name": "Pooling", "protocol_name": "Sample Pooling",
         "specifications": []},
        {"name": "Experiment Run Illumina", "protocol_name": "Illumina Preparation",
         "specifications": []},
        {"name": "Experiment Run DNBSEQ", "protocol_name": "DNBSEQ Preparation",
         "specifications": []},
        {"name": "Library Conversion", "protocol_name": "Library Conversion",
         "specifications": []},
        {"name": "Library Capture (MCC)", "protocol_name": "Library Capture",
         "specifications": [{"display_name": "Capture Type", "sheet_name": "Capture Batch", "column_name": "Capture Type", "value": "MCC"}]},
        {"name": "Library Capture (Exome)", "protocol_name": "Library Capture",
         "specifications": [{"display_name": "Capture Type", "sheet_name": "Capture Batch", "column_name": "Capture Type", "value": "Exome"}]},
        {"name": "Library Capture (Panel)", "protocol_name": "Library Capture",
         "specifications": [{"display_name": "Capture Type", "sheet_name": "Capture Batch", "column_name": "Capture Type", "value": "Panel"}]},
    ]

    WORKFLOWS = [
        # (name, step_names)
        ("PCR-free Illumina", "Basic Illumina", ["Extraction (DNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (PCR-free, Illumina)", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run Illumina"]),
        ("PCR-enriched Illumina", "Basic Illumina", ["Extraction (DNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (PCR-enriched, Illumina)", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run Illumina"]),
        ("WGBS Illumina", "Basic Illumina", ["Extraction (DNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (WGBS, Illumina)", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run Illumina"]),
        ("RNASeq Illumina", "Basic Illumina", ["Extraction (RNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (RNASeq, Illumina)", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run Illumina"]),
        ("miRNA Illumina", "Basic Illumina", ["Extraction (RNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (miRNA, Illumina)", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run Illumina"]),
        ("16S Illumina", "Basic Illumina", ["Extraction (RNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (16S, Illumina)", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run Illumina"]),
        ("18S Illumina", "Basic Illumina", ["Extraction (RNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (18S, Illumina)", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run Illumina"]),
        ("PCR-free DNBSEQ", "Basic DNBSEQ", ["Extraction (DNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (PCR-free, DNBSEQ)", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run DNBSEQ"]),
        ("PCR-enriched Conversion DNBSEQ", "Conversion to DNBSEQ", ["Extraction (DNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (PCR-enriched, Illumina)", "Library QC", "Library Conversion", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run DNBSEQ"]),
        ("WGBS Conversion DNBSEQ", "Conversion to DNBSEQ", ["Extraction (DNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (WGBS, Illumina)", "Library QC", "Library Conversion", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run DNBSEQ"]),
        ("RNASeq Conversion DNBSEQ", "Conversion to DNBSEQ", ["Extraction (RNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (RNASeq, Illumina)", "Library QC", "Library Conversion", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run DNBSEQ"]),
        ("miRNA Conversion DNBSEQ", "Conversion to DNBSEQ", ["Extraction (RNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (miRNA, Illumina)", "Library QC", "Library Conversion", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run DNBSEQ"]),
        ("16S Conversion DNBSEQ", "Conversion to DNBSEQ", ["Extraction (RNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (16S, Illumina)", "Library QC", "Library Conversion", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run DNBSEQ"]),
        ("18S Conversion DNBSEQ", "Conversion to DNBSEQ", ["Extraction (RNA)", "Sample QC", "Normalization (Sample)", "Library Preparation (18S, Illumina)", "Library QC", "Library Conversion", "Library QC", "Normalization (Library)", "Pooling", "Experiment Run DNBSEQ"]),
        # Need to add all combinations of Capture Workflows
        ("Ready-to-Sequence Illumina", "Ready-to-Sequence", ["Library QC", "Normalization (Library)", "Pooling", "Experiment Run Illumina"]),
        ("Ready-to-Sequence DNBSEQ", "Ready-to-Sequence", ["Library QC", "Normalization (Library)", "Pooling", "Experiment Run DNBSEQ"])
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Create the basic initial workflows.")
        reversion.set_user(admin_user)

        for step_info in STEPS:
            protocol = Protocol.objects.get(name=step_info["protocol_name"])

            step = Step.objects.create(name=step_info["name"],
                                       protocol=protocol,
                                       created_by_id=admin_user_id,
                                       updated_by_id=admin_user_id)
            
            reversion.add_to_revision(step)

            for specification in step_info["specifications"]:
                step_specification = StepSpecification.objects.create(display_name=specification["display_name"],
                                                                      sheet_name=specification["sheet_name"],
                                                                      column_name=specification["column_name"],
                                                                      value=specification["value"],
                                                                      step=step,
                                                                      created_by_id=admin_user_id,
                                                                      updated_by_id=admin_user_id)

                reversion.add_to_revision(step_specification)

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
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0048_v3_14_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReferenceGenome',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('assembly_name', models.CharField(help_text='Assembly name of the reference genome.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('synonym', models.CharField(help_text='Other name of the reference genome.', max_length=200, null=True, blank=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('genbank_id', models.CharField(help_text='GenBank accession number of the reference genome.', max_length=200, null=True, blank=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('refseq_id', models.CharField(help_text='RefSeq identifier of the reference genome.', max_length=200, null=True, blank=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('size', models.DecimalField(max_digits=20, decimal_places=0, help_text='Number of base pairs of the reference genome.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_referencegenome_creation', to=settings.AUTH_USER_MODEL)),
                ('taxon', models.ForeignKey(help_text='Taxon associated to the reference genome.', on_delete=django.db.models.deletion.PROTECT, related_name='ReferenceGenomes', to='fms_core.taxon')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_referencegenome_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Step',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='Step name.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_)( ]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_step_creation', to=settings.AUTH_USER_MODEL)),
                ('protocol', models.ForeignKey(help_text='Protocol for the step.', on_delete=django.db.models.deletion.PROTECT, related_name='steps', to='fms_core.protocol')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_step_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Workflow',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='Worflow name.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_)( ]{1,200}$'))])),
                ('structure', models.CharField(help_text='Worflow structure.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_)( ]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_workflow_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_workflow_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Study',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('letter', models.CharField(help_text='Letter ordinally chosen to identify a study.', max_length=1, validators=[django.core.validators.RegexValidator(re.compile('^[A-Z]$'))])),
                ('start', models.PositiveIntegerField(help_text='Index to the order of the start of the assigned workflow for this study.')),
                ('end', models.PositiveIntegerField(help_text='Index to the order of the end of the assigned workflow for this study.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_study_creation', to=settings.AUTH_USER_MODEL)),
                ('project', models.ForeignKey(help_text='Study project.', on_delete=django.db.models.deletion.PROTECT, related_name='studies', to='fms_core.project')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_study_modification', to=settings.AUTH_USER_MODEL)),
                ('workflow', models.ForeignKey(help_text='Workflow assigned to the study.', on_delete=django.db.models.deletion.PROTECT, related_name='studies', to='fms_core.workflow')),
            ],
        ),
        migrations.CreateModel(
            name='StepSpecification',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('display_name', models.CharField(help_text='Name used to describe the value to the user.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))])),
                ('sheet_name', models.CharField(help_text='Name of the step template sheet.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))])),
                ('column_name', models.CharField(help_text='Name of the step template column.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))])),
                ('value', models.CharField(help_text='Value of the step specification', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_stepspecification_creation', to=settings.AUTH_USER_MODEL)),
                ('step', models.ForeignKey(help_text='The step of the step specification.', on_delete=django.db.models.deletion.PROTECT, related_name='StepSpecifications', to='fms_core.step')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_stepspecification_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='StepOrder',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('order', models.PositiveIntegerField(help_text='Ordinal value of the step in the workflow (starting at 1).')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_steporder_creation', to=settings.AUTH_USER_MODEL)),
                ('next_step_order', models.ForeignKey(null=True, blank=True, help_text='The next step following the one defined here.', on_delete=django.db.models.deletion.PROTECT, related_name='PreviousStepOrder', to='fms_core.steporder')),
                ('step', models.ForeignKey(help_text='The step of the step order.', on_delete=django.db.models.deletion.PROTECT, related_name='StepsOrder', to='fms_core.step')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_steporder_modification', to=settings.AUTH_USER_MODEL)),
                ('workflow', models.ForeignKey(help_text='Workflow of the step order.', on_delete=django.db.models.deletion.PROTECT, related_name='StepsOrder', to='fms_core.workflow')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SampleNextStep',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_samplenextstep_creation', to=settings.AUTH_USER_MODEL)),
                ('sample', models.ForeignKey(help_text='The sample queued to the workflow.', on_delete=django.db.models.deletion.PROTECT, related_name='SampleNextStep', to='fms_core.sample')),
                ('step_order', models.ForeignKey(null=True, blank=True, help_text='The next step a sample has to complete in the study.', on_delete=django.db.models.deletion.PROTECT, related_name='SampleNextStep', to='fms_core.steporder')),
                ('study', models.ForeignKey(help_text='The study using the workflow that is followed by the sample.', on_delete=django.db.models.deletion.PROTECT, related_name='SampleNextStep', to='fms_core.study')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_samplenextstep_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='workflow',
            name='steps',
            field=models.ManyToManyField(blank=True, related_name='workflows', through='fms_core.StepOrder', to='fms_core.Step'),
        ),
        migrations.AddConstraint(
            model_name='study',
            constraint=models.UniqueConstraint(fields=('letter', 'project_id'), name='study_letter_projectid_key'),
        ),
        migrations.AddConstraint(
            model_name='steporder',
            constraint=models.UniqueConstraint(fields=('order', 'workflow_id'), name='steporder_order_workflowid_key'),
        ),
        migrations.AddConstraint(
            model_name='samplenextstep',
            constraint=models.UniqueConstraint(fields=('step_order', 'sample', 'study'), name='samplenextstep_steporder_sample_study_key'),
        ),
        migrations.RunPython(
            initialize_reference_genomes,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            initialize_workflows,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AddField(
            model_name='individual',
            name='reference_genome',
            field=models.ForeignKey(null=True, blank=True, help_text='Reference genome used to analyze samples.', on_delete=django.db.models.deletion.PROTECT, related_name='individuals', to='fms_core.referencegenome'),
        ),
    ]
