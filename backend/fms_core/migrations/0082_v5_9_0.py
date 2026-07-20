import reversion

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import migrations, models
import django.db.models.deletion


ADMIN_USERNAME = 'biobankadmin'

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
                ('external_id', models.CharField(help_text='Identifier to connect to an external system.', max_length=200)),
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
    ]