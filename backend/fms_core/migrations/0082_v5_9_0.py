import reversion

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import migrations, models
import django.db.models.deletion


ADMIN_USERNAME = 'biobankadmin'

def make_library_normalization_step_optional(apps, schema_editor):
    StepOrder = apps.get_model('fms_core', 'StepOrder')
    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        reversion.set_comment('Make Normalization (Library) step optional for Ultima workflow.')
        reversion.set_user(admin_user)

        step_order = StepOrder.objects.get(
            step__name="Normalization (Library)",
            workflow__name="Ready-to-Sequence Ultima"
        )

        step_order.mandatory = False
        step_order.save()
        reversion.add_to_revision(step_order)

def populate_parent_project(apps, schema_editor):
    Project = apps.get_model("fms_core", "Project")
    ParentProject = apps.get_model("fms_core", "ParentProject")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"Initialize Parent Project model using prefefined values and existing data from Project model.")
        reversion.set_user(admin_user)

        # Pre-defined parent projects
        PREDEFINED_ID_NAME_PAIRS = {
            "P000000": "UNKNOWN",
            "P000001": "TESTS",
            "P000002": "SHARED REAGENTS AND CONTROLS",
            "P000003": "INTERNAL WORKSHOPS",
            "P000004": "BIOBANKS",
        }
        for external_id, name in PREDEFINED_ID_NAME_PAIRS.items():
            parent_project_obj = ParentProject.objects.create(external_id=external_id,
                                                              name=name,
                                                              created_by_id=admin_user.id,
                                                              updated_by_id=admin_user.id)
            reversion.add_to_revision(parent_project_obj)

        # parent projects taken from project model
        for project_obj in Project.objects.all():
            if project_obj.external_id and not ParentProject.objects.filter(external_id=project_obj.external_id).exists():
                parent_project_name = project_obj.external_name or project_obj.name # use project external name in priority and defaults to the project name
                parent_project_obj = ParentProject.objects.create(external_id=project_obj.external_id,
                                                                  name=parent_project_name,
                                                                  created_by_id=admin_user.id,
                                                                  updated_by_id=admin_user.id)
            reversion.add_to_revision(parent_project_obj)

def populate_foreign_key_to_parent_project(apps, schema_editor):
    Project = apps.get_model("fms_core", "Project")
    ParentProject = apps.get_model("fms_core", "ParentProject")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"Set Project model foreign key to Parent Project model.")
        reversion.set_user(admin_user)

        for project_obj in Project.objects.all():
            if project_obj.external_id:
                parent_project_obj = ParentProject.objects.get(external_id=project_obj.external_id)
                project_obj.parent_project = parent_project_obj
                project_obj.save()
                reversion.add_to_revision(project_obj)


class Migration(migrations.Migration):
    dependencies = [
        ('fms_core', '0081_v5_8_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='ParentProject',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('external_id', models.CharField(help_text='Identifier to connect to an external system.', max_length=200, unique=True)),
                ('name', models.CharField(help_text='Parent project name used by external client.', max_length=200)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='project',
            name='parent_project',
            field=models.ForeignKey(blank=True, help_text='Parent project from external system.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='projects', to='fms_core.parentproject'),
        ),
        migrations.AddIndex(
            model_name='parentproject',
            index=models.Index(fields=['external_id'], name='parentproject_externalid_idx'),
        ),
        migrations.AddIndex(
            model_name='parentproject',
            index=models.Index(fields=['name'], name='parentproject_name_idx'),
        ),
        migrations.RunPython(populate_parent_project, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(populate_foreign_key_to_parent_project, reverse_code=migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='project',
            name='external_id',
        ),
        migrations.RemoveField(
            model_name='project',
            name='external_name',
        ),
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('axiom 96-format array pmra', 'axiom 96-format array pmra'), ('axiom 96-format array ukbb', 'axiom 96-format array ukbb'), ('infinium epic 8 beadchip', 'infinium epic 8 beadchip'), ('infinium gs 24 beadchip', 'infinium gs 24 beadchip'), ('dnbseq-g400 flowcell', 'dnbseq-g400 flowcell'), ('dnbseq-t7 flowcell', 'dnbseq-t7 flowcell'), ('illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-1.5b flowcell'), ('illumina-novaseq-x-5b flowcell', 'illumina-novaseq-x-5b flowcell'), ('illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-10b flowcell'), ('illumina-novaseq-x-25b flowcell', 'illumina-novaseq-x-25b flowcell'), ('illumina-novaseq-sp flowcell', 'illumina-novaseq-sp flowcell'), ('illumina-novaseq-s1 flowcell', 'illumina-novaseq-s1 flowcell'), ('illumina-novaseq-s2 flowcell', 'illumina-novaseq-s2 flowcell'), ('illumina-novaseq-s4 flowcell', 'illumina-novaseq-s4 flowcell'), ('illumina-miseq-v2 flowcell', 'illumina-miseq-v2 flowcell'), ('illumina-miseq-v3 flowcell', 'illumina-miseq-v3 flowcell'), ('illumina-miseq-micro flowcell', 'illumina-miseq-micro flowcell'), ('illumina-miseq-nano flowcell', 'illumina-miseq-nano flowcell'), ('illumina-miseq-i100-5m flowcell', 'illumina-miseq-i100-5m flowcell'), ('illumina-miseq-i100-25m flowcell', 'illumina-miseq-i100-25m flowcell'), ('illumina-miseq-i100-50m flowcell', 'illumina-miseq-i100-50m flowcell'), ('illumina-miseq-i100-100m flowcell', 'illumina-miseq-i100-100m flowcell'), ('illumina-iseq-100 flowcell', 'illumina-iseq-100 flowcell'), ('pacbio-revio smrt cell tray', 'pacbio-revio smrt cell tray'), ('ultima wafer', 'ultima wafer'), ('tube', 'tube'), ('tube strip 2x1', 'tube strip 2x1'), ('tube strip 3x1', 'tube strip 3x1'), ('tube strip 4x1', 'tube strip 4x1'), ('tube strip 5x1', 'tube strip 5x1'), ('tube strip 6x1', 'tube strip 6x1'), ('tube strip 7x1', 'tube strip 7x1'), ('tube strip 8x1', 'tube strip 8x1'), ('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'), ('tube box 3x3', 'tube box 3x3'), ('tube box 6x6', 'tube box 6x6'), ('tube box 7x7', 'tube box 7x7'), ('tube box 8x8', 'tube box 8x8'), ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'), ('tube box 21x10', 'tube box 21x10'), ('tube rack 4x6', 'tube rack 4x6'), ('tube rack 8x12', 'tube rack 8x12'), ('box', 'box'), ('drawer', 'drawer'), ('freezer rack 2x4', 'freezer rack 2x4'), ('freezer rack 3x4', 'freezer rack 3x4'), ('freezer rack 4x4', 'freezer rack 4x4'), ('freezer rack 4x6', 'freezer rack 4x6'), ('freezer rack 5x4', 'freezer rack 5x4'), ('freezer rack 6x4', 'freezer rack 6x4'), ('freezer rack 7x4', 'freezer rack 7x4'), ('freezer rack 10x5', 'freezer rack 10x5'), ('freezer rack 8x6', 'freezer rack 8x6'), ('freezer rack 11x6', 'freezer rack 11x6'), ('freezer rack 16x6', 'freezer rack 16x6'), ('freezer rack 11x7', 'freezer rack 11x7'), ('freezer 3 shelves', 'freezer 3 shelves'), ('freezer 4 shelves', 'freezer 4 shelves'), ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room'), ('site', 'site')], help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.', max_length=40),
        ),
        migrations.AlterField(
            model_name='experimentrun',
            name='container',
            field=models.OneToOneField(help_text='Container', limit_choices_to={'kind__in': ('axiom 96-format array pmra', 'axiom 96-format array ukbb', 'infinium epic 8 beadchip', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-5b flowcell', 'illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-25b flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-miseq-i100-5m flowcell', 'illumina-miseq-i100-25m flowcell', 'illumina-miseq-i100-50m flowcell', 'illumina-miseq-i100-100m flowcell', 'illumina-iseq-100 flowcell', 'pacbio-revio smrt cell tray', 'ultima wafer')}, on_delete=django.db.models.deletion.PROTECT, related_name='experiment_run', to='fms_core.container'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='container',
            field=models.ForeignKey(help_text='Container in which the sample is placed.', limit_choices_to={'kind__in': ('axiom 96-format array pmra', 'axiom 96-format array ukbb', 'infinium epic 8 beadchip', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-5b flowcell', 'illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-25b flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-miseq-i100-5m flowcell', 'illumina-miseq-i100-25m flowcell', 'illumina-miseq-i100-50m flowcell', 'illumina-miseq-i100-100m flowcell', 'illumina-iseq-100 flowcell', 'pacbio-revio smrt cell tray', 'ultima wafer', 'tube', 'tube strip 2x1', 'tube strip 3x1', 'tube strip 4x1', 'tube strip 5x1', 'tube strip 6x1', 'tube strip 7x1', 'tube strip 8x1', '96-well plate', '384-well plate')}, on_delete=django.db.models.deletion.PROTECT, related_name='samples', to='fms_core.container'),
        ),

        migrations.AddField(
            model_name='steporder',
            name='mandatory',
            field=models.BooleanField(default=True, help_text='Samples cannot skip this step in this workflow.'),
        ),
        migrations.AlterField(
            model_name='stephistory',
            name='workflow_action',
            field=models.CharField(choices=[('NEXT_STEP', 'Step complete - Move to next step'), ('DEQUEUE_SAMPLE', 'Sample failed - Remove sample from study workflow'), ('REPEAT_STEP', 'Repeat step - Move to next step and repeat current step'), ('REPEAT_QC_STEP', 'Repeat QC step - Repeat current QC step'), ('SKIP_STEP', 'Step skipped - Move to next step'), ('IGNORE_WORKFLOW', 'Ignore workflow - Do not register as part of a workflow')], default='NEXT_STEP', help_text='Workflow action that was performed on the sample after step completion.', max_length=30),
        ),
        migrations.RunPython(make_library_normalization_step_optional, reverse_code=migrations.RunPython.noop),
    ]
