from django.conf import settings
from django.db import migrations, models
from datetime import date
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'


def add_property_types_for_normalization(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Add properties' type for Normalization")
        reversion.set_user(admin_user)

        PROPERTY_TYPES_BY_PROTOCOL = {
            "Normalization": [
                ("Final Volume", "str", False),
                ("Final Concentration", "str", False),
            ]
        }

        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name, created_by_id=admin_user_id,
                                               updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            for (property, value_type, is_optional) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                # All properties are required for normalization
                pt = PropertyType.objects.create(name=property,
                                                 object_id=protocol.id,
                                                 content_type=protocol_content_type,
                                                 value_type=value_type,
                                                 is_optional=is_optional,
                                                 created_by_id=admin_user_id, updated_by_id=admin_user_id)
                reversion.add_to_revision(pt)


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
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0039_v3_9_0'),
    ]

    operations = [
        migrations.RunPython(
            add_property_types_for_normalization,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            fix_future_dates,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.CreateModel(
            name='IdGenerator',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
            ],
        ),
    ]
