from django.db import migrations
from django.contrib.auth.models import User
import reversion
from datetime import date

ADMIN_USERNAME = 'biobankadmin'

def fix_future_dates(apps, schema_editor):
    """
    Set the creation_date and execution_date to the current date in the cases
    where the dates are set to a date after the current date. This is to prevent
    historical data to conflict with a new validation added with release v3.10.0.

    Args:
        apps: apps class handle
        schema_editor: ignore
    """
    Sample = apps.get_model("fms_core", "Sample")
    ProcessMeasurement = apps.get_model("fms_core", "ProcessMeasurement")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        today = date.today()

        reversion.set_comment(f"Change dates in the future to pass validation (set to current date {today}).")
        reversion.set_user(admin_user)

        for future_sample in Sample.objects.all().filter(creation_date__gt=today):
            future_sample.creation_date=today
            future_sample.save()
            reversion.add_to_revision(future_sample)

        for future_pm in ProcessMeasurement.objects.all().filter(execution_date__gt=today):
            future_pm.execution_date=today
            future_pm.save()
            reversion.add_to_revision(future_pm)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0039_v3_9_0'),
    ]

    operations = [
        migrations.RunPython(
            fix_future_dates,
            reverse_code=migrations.RunPython.noop,
        )
    ]