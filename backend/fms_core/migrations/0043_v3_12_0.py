from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import fms_core.schema_validators


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0042_v3_12_0'),
    ]

    operations = [
    ]
