import reversion
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def rename_existing_generic_individuals(apps, schema_editor):
    GENERIC_PREFIX = "GENERIC_"
    REPLACEMENT_PREFIX = "GEN_"
    Individual = apps.get_model("fms_core", "Individual")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Modify name of existing individuals that conflict with generic naming convention.")
        reversion.set_user(admin_user)

        individuals = Individual.objects.filter(name__startswith=GENERIC_PREFIX).all()
        for individual in individuals:
            if individual.alias is None:
                individual.alias = individual.name
            individual.name = individual.name.replace(GENERIC_PREFIX, REPLACEMENT_PREFIX, 1)
            individual.save()
            reversion.add_to_revision(individual)

def initialize_default_reference_genome(apps, schema_editor):
    DEFAULT_REFERENCE_GENOME = {9606: "GRCh38.p14", # Human
                                10090: "GRCm39", # Mouse
                               }  
    Taxon = apps.get_model("fms_core", "Taxon")
    ReferenceGenome = apps.get_model("fms_core", "ReferenceGenome")
 
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Set default reference genome for human and mouse.")
        reversion.set_user(admin_user)

        for ncbi_taxon_id, default_assembly_name in DEFAULT_REFERENCE_GENOME.items():
            taxon_obj  = Taxon.objects.get(ncbi_id=ncbi_taxon_id)
            reference_genome_obj = ReferenceGenome.objects.get(assembly_name=default_assembly_name)
            taxon_obj.default_reference_genome = reference_genome_obj
            taxon_obj.save()
            reversion.add_to_revision(taxon_obj)

def create_generic_individuals(apps, schema_editor):
    GENERIC_INDIVIDUALS = [
        {"name": "GENERIC_HUMAN_MALE_GRCh38.p14", "sex": "M", "taxon": 9606, "reference_genome": "GRCh38.p14"},
        {"name": "GENERIC_HUMAN_FEMALE_GRCh38.p14", "sex": "F", "taxon": 9606, "reference_genome": "GRCh38.p14"},
        {"name": "GENERIC_HUMAN_UNKNOWN_GRCh38.p14", "sex": "Unknown", "taxon": 9606, "reference_genome": "GRCh38.p14"},
        {"name": "GENERIC_HUMAN_MALE_GRCh37.p13", "sex": "M", "taxon": 9606, "reference_genome": "GRCh37.p13"},
        {"name": "GENERIC_HUMAN_FEMALE_GRCh37.p13", "sex": "F", "taxon": 9606, "reference_genome": "GRCh37.p13"},
        {"name": "GENERIC_HUMAN_UNKNOWN_GRCh37.p13", "sex": "Unknown", "taxon": 9606, "reference_genome": "GRCh37.p13"},
        {"name": "GENERIC_HUMAN_MALE_hs37d5", "sex": "M", "taxon": 9606, "reference_genome": "hs37d5"},
        {"name": "GENERIC_HUMAN_FEMALE_hs37d5", "sex": "F", "taxon": 9606, "reference_genome": "hs37d5"},
        {"name": "GENERIC_HUMAN_UNKNOWN_hs37d5", "sex": "Unknown", "taxon": 9606, "reference_genome": "hs37d5"},
        {"name": "GENERIC_MOUSE_MALE_GRCm39", "sex": "M", "taxon": 10090, "reference_genome": "GRCm39"},
        {"name": "GENERIC_MOUSE_FEMALE_GRCm39", "sex": "F", "taxon": 10090, "reference_genome": "GRCm39"},
        {"name": "GENERIC_MOUSE_UNKNOWN_GRCm39", "sex": "Unknown", "taxon": 10090, "reference_genome": "GRCm39"},
        {"name": "GENERIC_MOUSE_MALE_GRCm38.p6", "sex": "M", "taxon": 10090, "reference_genome": "GRCm38.p6"},
        {"name": "GENERIC_MOUSE_FEMALE_GRCm38.p6", "sex": "F", "taxon": 10090, "reference_genome": "GRCm38.p6"},
        {"name": "GENERIC_MOUSE_UNKNOWN_GRCm38.p6", "sex": "Unknown", "taxon": 10090, "reference_genome": "GRCm38.p6"},
    ]
    Individual = apps.get_model("fms_core", "Individual")
    ReferenceGenome = apps.get_model("fms_core", "ReferenceGenome")
    Taxon = apps.get_model("fms_core", "Taxon")

    reference_genome_by_assembly_name = {}
    taxon_by_ncbi_id = {}
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create generic individuals to be tied to samples at sample submission.")
        reversion.set_user(admin_user)

        for individual_data in GENERIC_INDIVIDUALS:
            reference_genome_obj = reference_genome_by_assembly_name.get(individual_data["reference_genome"], None)
            if reference_genome_obj is None:
                reference_genome_obj = ReferenceGenome.objects.get(assembly_name=individual_data["reference_genome"])
                reference_genome_by_assembly_name[individual_data["reference_genome"]] = reference_genome_obj
            taxon_obj = taxon_by_ncbi_id.get(individual_data["taxon"], None)
            if taxon_obj is None:
                taxon_obj = Taxon.objects.get(ncbi_id=individual_data["taxon"])
                taxon_by_ncbi_id[individual_data["taxon"]] = taxon_obj
            individual_obj = Individual.objects.create(name=individual_data["name"],
                                                       sex=individual_data["sex"],
                                                       taxon=taxon_obj,
                                                       reference_genome=reference_genome_obj,
                                                       generic=True,
                                                       created_by_id=admin_user_id,
                                                       updated_by_id=admin_user_id)
            reversion.add_to_revision(individual_obj)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0063_v4_10_0'),
    ]

    operations = [
        migrations.RunPython(
            rename_existing_generic_individuals,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='stephistory',
            name='workflow_action',
            field=models.CharField(choices=[('NEXT_STEP', 'Step complete - Move to next step'), ('DEQUEUE_SAMPLE', 'Sample failed - Remove sample from study workflow'), ('REPEAT_STEP', 'Repeat step - Move to next step and repeat current step'), ('IGNORE_WORKFLOW', 'Ignore workflow - Do not register as part of a workflow')], default='NEXT_STEP', help_text='Workflow action that was performed on the sample after step completion.', max_length=30),
        ),
        migrations.AddField(
            model_name='taxon',
            name='default_reference_genome',
            field=models.ForeignKey(blank=True, help_text='Default reference genome for the taxon when creating individuals.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='default_for_taxons', to='fms_core.referencegenome'),
        ),
        migrations.RunPython(
            initialize_default_reference_genome,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AddField(
            model_name='individual',
            name='generic',
            field=models.BooleanField(default=False, help_text='Generic individual used to replace undefined individuals that share characteristics.'),
        ),
        migrations.RunPython(
            create_generic_individuals,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
