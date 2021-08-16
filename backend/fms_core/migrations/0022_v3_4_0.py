import django.core.validators
from django.db import migrations, models
import re


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0021_v3_3_0'),
    ]

    operations = [
        migrations.AlterField(
            model_name='container',
            name='barcode',
            field=models.CharField(help_text='Unique container barcode.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[\\S]{1,200}$'))]),
        ),
    ]
