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
        # (Assembly name, GenBank, RefSeq, taxon_id, size)
        ("GRCh38.p14", "GCA_000001405.29", "GCF_000001405.40", 9606, 3099000000),
        ("GRCm39", "GCA_000001635.9", "GCF_000001635.27", 10090, 2728000000),
        ("ASM985889v3", "GCA_009858895.3", "GCF_009858895.2", 2697049, 29900),
        ("ASM886v2", "GCA_000008865.2", "GCF_000008865.2", 562, 5595000),
        ("ASM584v2", "GCA_000005845.2", "GCF_000005845.2", 562, 4642000),
        ("ROS_Cfam_1.0", "GCA_014441545.1", "GCF_014441545.1", 9615, 2397000000)
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Add commonly used Reference Genomes.")
        reversion.set_user(admin_user)

        for assembly_name, genbank_id, refseq_id, taxon_ncbi_id, size in REFERENCE_GENOMES:
            taxon = Taxon.objects.get(ncbi_id=taxon_ncbi_id)

            reference_genome = ReferenceGenome.objects.create(assembly_name=assembly_name,
                                                              genbank_id=genbank_id,
                                                              refseq_id=refseq_id,
                                                              taxon=taxon,
                                                              size=size,
                                                              created_by_id=admin_user_id,
                                                              updated_by_id=admin_user_id)
            reversion.add_to_revision(reference_genome)


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
                ('genbank_id', models.CharField(help_text='GenBank accession number of the reference genome.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('refseq_id', models.CharField(help_text='RefSeq identifier of the reference genome.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('size', models.PositiveIntegerField(help_text='Number of base pairs of the reference genome.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_referencegenome_creation', to=settings.AUTH_USER_MODEL)),
                ('taxon', models.ForeignKey(help_text='Reference genome used to analyze samples in the study.', on_delete=django.db.models.deletion.PROTECT, related_name='ReferenceGenomes', to='fms_core.taxon')),
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
                ('name', models.CharField(help_text='Step name.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))])),
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
                ('name', models.CharField(help_text='Worflow name.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
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
                ('letter', models.CharField(help_text='Letter ordinally chosen to identify a study.', max_length=1)),
                ('start', models.PositiveIntegerField(help_text='Index to the order of the start of the assigned workflow for this study.')),
                ('end', models.PositiveIntegerField(help_text='Index to the order of the end of the assigned workflow for this study.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_study_creation', to=settings.AUTH_USER_MODEL)),
                ('project', models.ForeignKey(help_text='Study project.', on_delete=django.db.models.deletion.PROTECT, related_name='studies', to='fms_core.project')),
                ('reference_genome', models.ForeignKey(help_text='Reference genome used to analyze samples in the study.', on_delete=django.db.models.deletion.PROTECT, related_name='studies', to='fms_core.referencegenome')),
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
                ('next_step_order', models.ForeignKey(help_text='The next step following the one defined here.', on_delete=django.db.models.deletion.PROTECT, related_name='PreviousStepOrder', to='fms_core.steporder')),
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
                ('step', models.ForeignKey(help_text='The next step a sample has to complete in the study.', on_delete=django.db.models.deletion.PROTECT, related_name='SampleNextStep', to='fms_core.step')),
                ('study', models.ForeignKey(help_text='The study using the workflow that is followed by the sample.', on_delete=django.db.models.deletion.PROTECT, related_name='SampleNextStep', to='fms_core.study')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_samplenextstep_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddConstraint(
            model_name='study',
            constraint=models.UniqueConstraint(fields=('letter', 'project_id'), name='study_letter_projectid_key'),
        ),
        migrations.RunPython(
            initialize_reference_genomes,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
