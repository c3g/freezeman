from django.conf import settings
from django.db import migrations
from django.contrib.auth.models import User
import reversion
import datetime


ADMIN_USERNAME='biobankadmin'

def initialize_projects_data(apps, schema_editor):
    Sample = apps.get_model("fms_core", "Sample")
    Project = apps.get_model("fms_core", "Project")
    SampleByProject = apps.get_model("fms_core", "SampleByProject")

    admin_user = User.objects.get(username=ADMIN_USERNAME)
    admin_user_id = admin_user.id

    with reversion.create_revision(manage_manually=True):
        reversion.set_comment("Initialization of projects through curation")
        reversion.set_user(User.objects.get(username=ADMIN_USERNAME))

        projects_by_cohort_name = {}
        for (project_name, cohort_name) in [('Epocrates', 'EPOCRATES'), ('BQC19', 'BQC'), ('INSPQ_COVID', 'INSPQ_COVID'), ('Timmins', 'Timmins')]:
            p = Project.objects.create(name=project_name, status="Open", created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(p)
            projects_by_cohort_name[cohort_name] = p


        for sample in Sample.objects.filter(individual__cohort__in=["EPOCRATES", 'BQC', 'INSPQ_COVID', 'Timmins']).select_related('individual'):
            cohort = sample.individual.cohort
            sp = SampleByProject.objects.create(sample=sample, project=projects_by_cohort_name[cohort], created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(sp)


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