# Generated by Django 4.2.4 on 2023-12-21 21:50

import django.core.validators
from django.db import migrations, models
import re


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0058_v4_6_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='experimentrun',
            name='external_name',
            field=models.CharField(blank=True, help_text='Name given to the run by the instrument.', max_length=200, null=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))]),
        ),
    ]