
from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import re


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0076_v5_5_0_data'),
    ]

    operations = [        
        migrations.AddIndex(
            model_name='index',
            index=models.Index(fields=['name'], name='index_name_idx'),
        ),
        migrations.AddIndex(
            model_name='librarytype',
            index=models.Index(fields=['name'], name='librarytype_name_idx'),
        ),
    ]