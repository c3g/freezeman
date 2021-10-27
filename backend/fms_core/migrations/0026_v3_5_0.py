# Generated by Django 3.1 on 2021-10-27 18:16

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import fms_core.schema_validators
import re


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0025_v3_5_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='Biosample',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('alias', models.CharField(blank=True, help_text='Alternative biosample name given by the collaborator or customer.', max_length=200, null=True)),
                ('collection_site', models.CharField(help_text='The facility designated for the collection of samples.', max_length=200)),
                ('comment', models.TextField(blank=True, help_text='Other relevant information about the biosample.', null=True)),
                ('temp_name', models.CharField(help_text='Temporary name', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_biosample_creation', to=settings.AUTH_USER_MODEL)),
                ('individual', models.ForeignKey(blank=True, help_text='Individual associated with the biosample.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='biosamples', to='fms_core.individual')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_biosample_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='DerivedSample',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('experimental_group', models.JSONField(blank=True, default=list, help_text='Sample group having some common characteristics. It is the way to designate a subgroup within a study.', validators=[fms_core.schema_validators.JsonSchemaValidator({'$id': 'fms:experimental_group', '$schema': 'http://json-schema.org/draft-07/schema#', 'description': 'Schema used to define experimental groups for a sample.', 'items': {'minLength': 1, 'type': 'string'}, 'title': 'Experimental group schema', 'type': 'array', 'uniqueItems': True}, formats=None)])),
                ('tissue_source', models.CharField(blank=True, choices=[('BAL', 'BAL'), ('Biopsy', 'Biopsy'), ('Blood', 'Blood'), ('Cells', 'Cells'), ('Expectoration', 'Expectoration'), ('Gargle', 'Gargle'), ('Plasma', 'Plasma'), ('Saliva', 'Saliva'), ('Swab', 'Swab'), ('Tumor', 'Tumor'), ('Buffy coat', 'Buffy coat'), ('Tail', 'Tail')], help_text='Can only be specified if the biospecimen type is DNA or RNA.', max_length=200)),
                ('library', models.CharField(blank=True, max_length=200, null=True)),
                ('index', models.CharField(blank=True, max_length=200, null=True)),
                ('biosample', models.ForeignKey(help_text='Biosample associated to this DerivedSample', on_delete=django.db.models.deletion.PROTECT, related_name='derived_samples', to='fms_core.biosample')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_derivedsample_creation', to=settings.AUTH_USER_MODEL)),
                ('sample_kind', models.ForeignKey(help_text='Biological material collected from study subject during the conduct of a genomic study project.', on_delete=django.db.models.deletion.PROTECT, to='fms_core.samplekind')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_derivedsample_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='DerivedBySample',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('volume_ratio', models.DecimalField(decimal_places=3, help_text='Volume ratio', max_digits=4)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_derivedbysample_creation', to=settings.AUTH_USER_MODEL)),
                ('derived_sample', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='derived_by_samples', to='fms_core.derivedsample')),
                ('sample', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='derived_by_samples', to='fms_core.sample')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_derivedbysample_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.RunSQL(
            """
                INSERT INTO fms_core_biosample (individual_id, alias, collection_site, comment, created_at, created_by_id, updated_at, updated_by_id, deleted, temp_name)
                SELECT sample.individual_id, sample.alias, sample.collection_site, sample.comment, sample.created_at, sample.created_by_id, current_timestamp, 1, FALSE, sample.name
                FROM fms_core_sample sample
                INNER JOIN
                (
                        SELECT individual_id, collection_site, name, MIN(created_at) min_created_at
                        FROM fms_core_sample
                        GROUP BY name, individual_id, collection_site
                ) grouped_sample ON
                    sample.individual_id = grouped_sample.individual_id
                    AND sample.collection_site = grouped_sample.collection_site
                    AND sample.created_at = grouped_sample.min_created_at
                    AND sample.name = grouped_sample.name;
            """,
            migrations.RunSQL.noop
        ),
        migrations.RunSQL(
            """
                INSERT INTO fms_core_derivedsample (biosample_id, tissue_source, experimental_group, sample_kind_id, created_at, created_by_id, updated_at, updated_by_id, deleted)
                SELECT biosample.id, sample.tissue_source, sample.experimental_group, sample.sample_kind_id, sample.created_at, sample.created_by_id, current_timestamp, 1, FALSE
                FROM fms_core_sample sample
                JOIN fms_core_biosample biosample
                ON sample.name = biosample.temp_name;
            """,
            migrations.RunSQL.noop
        ),
        migrations.RunSQL(
            """
                INSERT INTO fms_core_derivedbysample (derived_sample_id, sample_id, volume_ratio, created_at, created_by_id, updated_at, updated_by_id, deleted)
                SELECT derivedsample.id, sample.id, 1, derivedsample.created_at, derivedsample.created_by_id, current_timestamp, 1, FALSE
                FROM fms_core_derivedsample derivedsample
                JOIN fms_core_biosample biosample
                ON derivedsample.biosample_id = biosample.id
                JOIN fms_core_sample sample
                ON biosample.temp_name = sample.name;
            """,
            migrations.RunSQL.noop
        ),
    ]
