from django.conf import settings
from django.db import migrations
from django.contrib.auth.models import User
import reversion


ADMIN_USERNAME='biobankadmin'

def initialize_projects_data(apps, schema_editor):
    Project = apps.get_model("fms_core", "Project")

    admin_user = User.objects.get(username=ADMIN_USERNAME)
    admin_user_id = admin_user.id

    with reversion.create_revision(manage_manually=True):
        reversion.set_comment("Initialization of projects through curation")
        reversion.set_user(User.objects.get(username=ADMIN_USERNAME))

        for project_name in ['Epocrates', 'BQC19', 'CoVSeQ', 'Timmins', 'GEM']:
            p = Project.objects.create(name=project_name, status="Open", created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(p)


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
        migrations.RunSQL(
            """
                INSERT INTO fms_core_samplebyproject (sample_id, project_id, created_at, updated_at, created_by_id, updated_by_id, deleted)
                SELECT sample.id, project.id, project.created_at, project.updated_at, project.created_by_id, project.updated_by_id, false
                FROM fms_core_sample sample
                    JOIN fms_core_individual individual ON sample.individual_id = individual.id
                    JOIN fms_core_project project ON
                        (CASE
                            WHEN individual.cohort = 'EPOCRATES' AND project.name = 'Epocrates' THEN 1
                            WHEN individual.cohort = 'BQC' AND project.name = 'BQC19' THEN 1
                            WHEN individual.cohort = 'INSPQ_COVID' AND project.name = 'CoVSeQ' THEN 1
                            WHEN individual.cohort = 'Timmins' AND project.name = 'Timmins' THEN 1
                            WHEN individual.cohort = 'GEM' AND project.name = 'GEM' THEN 1
                            ELSE 0
                        END=1)
                WHERE individual.cohort IN ('EPOCRATES', 'BQC', 'INSPQ_COVID', 'Timmins', 'GEM');
            """,
            migrations.RunSQL.noop
        ),
    ]