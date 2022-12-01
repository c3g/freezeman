# Generated by Django 3.1 on 2022-12-01 19:24

import django.core.validators
from django.db import migrations, models
import re


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0047_v3_14_0'),
    ]

    operations = [
        migrations.AlterField(
            model_name='samplemetadata',
            name='name',
            field=models.CharField(help_text='The name of the metadata.', max_length=200, validators=[django.core.validators.RegexValidator(message="Double underscore i.e '__' are not allowed when naming metadata fields.", regex=re.compile('^(?!.*__)[a-zA-Z0-9.\\-_]{1,200}$'))]),
        ),
    ]
