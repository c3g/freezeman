# Generated by Django 3.1 on 2020-08-12 18:50

from django.db import migrations, models
import fms_core.schema_validators


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0006_v2_2_0'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sample',
            name='experimental_group',
            field=models.JSONField(blank=True, default=list, help_text='Sample group having some common characteristics. It is the way to designate a subgroup within a study.', validators=[fms_core.schema_validators.JsonSchemaValidator({'$id': 'fms:experimental_group', '$schema': 'http://json-schema.org/draft-07/schema#', 'description': 'Schema used to define experimental groups for a sample.', 'items': {'minLength': 1, 'type': 'string'}, 'title': 'Experimental group schema', 'type': 'array', 'uniqueItems': True}, formats=None)]),
        ),
        migrations.AlterField(
            model_name='sample',
            name='volume_history',
            field=models.JSONField(help_text='Volume of the sample in µL.', validators=[fms_core.schema_validators.JsonSchemaValidator({'$id': 'fms:volume', '$schema': 'http://json-schema.org/draft-07/schema#', 'description': 'Schema used to define volume and its updates.', 'items': {'additionalProperties': False, 'else': {'not': {'required': ['extracted_sample_id']}}, 'if': {'properties': {'update_type': {'const': 'extraction'}}}, 'properties': {'date': {'format': 'date-time', 'type': 'string'}, 'extracted_sample_id': {'type': 'integer'}, 'update_type': {'enum': ['extraction', 'update'], 'type': 'string'}, 'volume_value': {'pattern': '^(\\d*\\.\\d+|\\d+(\\.\\d*)?)$', 'type': 'string'}}, 'required': ['update_type', 'volume_value', 'date'], 'then': {'required': ['extracted_sample_id']}, 'type': 'object'}, 'minItems': 1, 'title': 'Volume schema', 'type': 'array'}, formats=['date-time'])], verbose_name='volume history in µL'),
        ),
    ]
