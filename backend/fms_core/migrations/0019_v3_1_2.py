from django.conf import settings
from django.db import migrations
from django.contrib.auth.models import User
import reversion
import datetime

ADMIN_USERNAME='biobankadmin'


def fix_process_data(apps, schema_editor):
    Version = apps.get_model("reversion", "Version")
    Revision = apps.get_model("reversion", "Revision")
    ProcessSample = apps.get_model("fms_core", "ProcessSample")
    Process = apps.get_model("fms_core", "Process")

    affected_revisions_ids = Revision.objects.filter(date_created__range=["2021-04-29", "2021-05-01"]).values_list('id', flat=True)

    for revision_id in affected_revisions_ids:
        # Getting all ProcessSample created in this revision
        list_affected_process_samples_ids = list(Version.objects.filter(content_type__model='processsample',
                                                              revision_id=revision_id).values_list('object_id', flat=True))

        if len(list_affected_process_samples_ids) > 1:
            process_samples = ProcessSample.objects.filter(id__in=list_affected_process_samples_ids)

            # Getting all distinct Processes related to those ProcessSample
            list_process_ids = list(process_samples.values_list('process_id', flat=True).distinct())

            # Checks if many processes were created instead of only one
            if len(list_process_ids) > 1:
                # First Process; the only one that will be kept
                first_process_id = min(list_process_ids)

                processes_to_delete = Process.objects.filter(pk__in=list_process_ids).exclude(pk=first_process_id)

                with reversion.create_revision(manage_manually=True):
                    reversion.set_comment("Curation of multiple processes into one process per template")
                    reversion.set_user(User.objects.get(username=ADMIN_USERNAME))

                    # Change process_id for ProcessSample now pointing to the wrong processes
                    for ps in process_samples:
                        ps.process_id = first_process_id
                        ps.save()
                        reversion.add_to_revision(ps)

                    # Delete Processes unused (should not have been created in first place)
                    for process in processes_to_delete:
                        process.comment = f'DELETE in curation {datetime.datetime.now().strftime("%Y-%m-%d")} v3.1.2 combined multiple processes - ' + process.comment
                        process.save()
                        reversion.add_to_revision(process)

                    # Update First Process for this revision batch with comment reflecting the current curation
                    first_process = Process.objects.get(id=first_process_id)
                    first_process.comment += f' - Curated {datetime.datetime.now().strftime("%Y-%m-%d")} v3.1.2 combined multiple processes'
                    first_process.save()
                    reversion.add_to_revision(first_process)


                # Delete all processes to be deleted (has to be done outside of the previous Revision scope)
                for process in processes_to_delete:
                    process.delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0018_v3_1_0'),
    ]

    operations = [
        migrations.RunPython(
            fix_process_data,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
