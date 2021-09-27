from django.conf import settings
from django.db import migrations
from django.contrib.auth.models import User
import reversion
import datetime


ADMIN_USERNAME='biobankadmin'

def initialize_projects_data(apps, schema_editor):
    Version = apps.get_model("reversion", "Version")
    Revision = apps.get_model("reversion", "Revision")

    Sample = apps.get_model("fms_core", "Sample")
    Project = apps.get_model("fms_core", "Project")
    SampleByProject = apps.get_model("fms_core", "SampleByProject")

    epocrates_samples = Sample.objects.filter(individual__cohort="EPOCRATES")

    with reversion.create_revision(manage_manually=True):
        reversion.set_comment("Initialization of projects through curation")
        reversion.set_user(User.objects.get(username=ADMIN_USERNAME))

        epocrates_project = Project.objects.create(name="EPOCRATES", status="Open")
        reversion.add_to_revision(epocrates_project)

        sample_by_project_objs = [SampleByProject(project=epocrates_project, sample=s) for s in epocrates_samples]
        #TODO: merge master/branch assign-sample-to-project to have access to SampleByProject
        SampleByProject.objects.bulk_create(sample_by_project_objs)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0022_v3_4_0'),
    ]

    operations = [
        migrations.RunPython(
            initialize_projects_data,
            reverse_code=migrations.RunPython.noop,
        ),
    ]