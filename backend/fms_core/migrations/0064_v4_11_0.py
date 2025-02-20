import reversion
import json
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def set_blank_project_external_id_to_null(apps, schema_editor):
    Project = apps.get_model("fms_core", "Project")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Replace blank by null external id for projects.")
        reversion.set_user(admin_user)

        for project in Project.objects.filter(external_id="").all():
            project.external_id = None
            project.save()
            reversion.add_to_revision(project)

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

def initialize_validated_by_and_released_by(apps, schema_editor):
    Readset = apps.get_model("fms_core", "Readset")
    Version = apps.get_model("reversion", "Version")

    readsets_validated_ids = list(Readset.objects.exclude(validation_status_timestamp__isnull=True).values_list("id", flat=True) or [])
    readsets_released_ids = list(Readset.objects.exclude(release_status_timestamp__isnull=True).values_list("id", flat=True) or [])
    readsets_to_update_ids = set(readsets_validated_ids + readsets_released_ids)

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Initialize the validated_by and released_by for readset validated and released before the fields were added.")
        reversion.set_user(admin_user)

        for readset_id in readsets_to_update_ids:
            readset_obj = Readset.objects.get(id=readset_id)
            validated_by_id = None
            released_by_id = None
            for readset_validated_version in Version.objects.filter(content_type__model="readset", object_id=readset_id).order_by('-id'):
                data = json.loads(readset_validated_version.serialized_data)
                validation_status_timestamp = data[0]["fields"].get("validation_status_timestamp", None)
                release_status_timestamp = data[0]["fields"].get("release_status_timestamp", None)
                if validated_by_id is None and validation_status_timestamp is not None:
                    validated_by_id = data[0]["fields"]["updated_by"]
                if released_by_id is None and release_status_timestamp is not None:
                    released_by_id = data[0]["fields"]["updated_by"]
                    
            if readset_id in readsets_validated_ids:
                readset_obj.validated_by_id = validated_by_id
            if readset_id in readsets_released_ids:
                readset_obj.released_by_id = released_by_id
            readset_obj.save()
            reversion.add_to_revision(readset_obj)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0063_v4_10_0'),
    ]

    operations = [
        migrations.RunPython(
            set_blank_project_external_id_to_null,
            reverse_code=migrations.RunPython.noop,
        ),
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
            name='is_generic',
            field=models.BooleanField(default=False, help_text='Flag indicating a generic individual used to replace undefined individuals that share characteristics.'),
        ),
        migrations.AddField(
            model_name='readset',
            name='released_by',
            field=models.ForeignKey(blank=True, help_text='User that released the readset data to the client.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='released_readsets', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='readset',
            name='validated_by',
            field=models.ForeignKey(blank=True, help_text='User that validated the readset data.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='validated_readsets', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(
            initialize_validated_by_and_released_by,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
