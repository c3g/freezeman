import reversion
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

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

    reference_genome_by_assembly_name = {}
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Create generic individuals to be tied to samples at sample submission.")
        reversion.set_user(admin_user)

        for individual_data in GENERIC_INDIVIDUALS:
            reference_genome_obj = reference_genome_by_assembly_name.get(individual_data["reference_genome"], None)
            if reference_genome_obj is None:
                reference_genome_obj = ReferenceGenome.objects.get(assembly_name=individual_data["reference_genome"])
                reference_genome_by_assembly_name[individual_data["reference_genome"]] = reference_genome_obj
                
            individual_obj = Individual.objects.create(name=individual_data["name"],
                                                       sex=individual_data["sex"],
                                                       taxon=individual_data["taxon"],
                                                       reference_genome=reference_genome_obj)
            reversion.add_to_revision(individual_obj)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0063_v4_10_0'),
    ]

    operations = [
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
            create_generic_individuals,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
