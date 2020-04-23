# Generated by Django 3.0.5 on 2020-04-23 22:02

import django.contrib.postgres.fields.jsonb
from django.db import migrations, models
import django.db.models.deletion
import fms_core.schema_validators


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0006_auto_20200423_1056'),
    ]

    operations = [
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'), ('tube', 'tube'), ('tube box 8x8', 'tube box 8x8'), ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'), ('tube rack 8x12', 'tube rack 8x12'), ('drawer', 'drawer'), ('freezer rack 4x4', 'freezer rack 4x4'), ('freezer rack 7x4', 'freezer rack 7x4'), ('freezer rack 8x6', 'freezer rack 8x6'), ('freezer 3 shelves', 'freezer 3 shelves'), ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room'), ('box', 'box')], help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.', max_length=20),
        ),
        migrations.AlterField(
            model_name='container',
            name='location',
            field=models.ForeignKey(blank=True, help_text='An existing (parent) container this container is located inside of.', limit_choices_to={'kind__in': ('tube box 8x8', 'tube box 9x9', 'tube box 10x10', 'tube rack 8x12', 'drawer', 'freezer rack 4x4', 'freezer rack 7x4', 'freezer rack 8x6', 'freezer 3 shelves', 'freezer 5 shelves', 'room', 'box')}, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='children', to='fms_core.Container'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='volume_history',
            field=django.contrib.postgres.fields.jsonb.JSONField(help_text='Volume of the sample in µL.', validators=[fms_core.schema_validators.JsonSchemaValidator({'$id': 'fms:volume', '$schema': 'http://json-schema.org/draft-07/schema#', 'description': 'Schema used to define volume and its updates.', 'items': {'additionalProperties': False, 'else': {'not': {'required': ['extracted_sample_id']}}, 'if': {'properties': {'update_type': {'const': 'extraction'}}}, 'properties': {'date': {'format': 'date-time', 'type': 'string'}, 'extracted_sample_id': {'type': 'integer'}, 'update_type': {'enum': ['extraction', 'update'], 'type': 'string'}, 'volume_value': {'pattern': '^(\\d*\\.\\d+|\\d+(\\.\\d*)?)$', 'type': 'string'}}, 'required': ['update_type', 'volume_value', 'date'], 'then': {'required': ['extracted_sample_id']}, 'type': 'object'}, 'minItems': 1, 'title': 'Volume schema', 'type': 'array'}, formats=['date-time'])], verbose_name='volume history in µL'),
        ),
    ]
