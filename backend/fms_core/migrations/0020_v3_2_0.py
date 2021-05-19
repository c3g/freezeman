# Generated by Django 3.1 on 2021-04-22 17:08

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import re


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0019_v3_1_2'),
    ]

    operations = [
        migrations.AlterField(
            model_name='container',
            name='barcode',
            field=models.CharField(help_text='Unique container barcode.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^.{1,200}$'))]),
        ),
        migrations.AlterField(
            model_name='container',
            name='name',
            field=models.CharField(help_text='Unique name for the container.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))]),
        ),
        migrations.AlterField(
            model_name='sample',
            name='name',
            field=models.CharField(help_text='Sample name.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))]),
        ),
        migrations.AlterField(
            model_name='sample',
            name='individual',
            field=models.ForeignKey(help_text='Individual associated with the sample.',
                                    on_delete=django.db.models.deletion.PROTECT, related_name='samples',
                                    to='fms_core.individual'),
        ),
    ]
