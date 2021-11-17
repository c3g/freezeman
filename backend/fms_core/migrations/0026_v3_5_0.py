# Generated by Django 3.1 on 2021-10-28 20:43

from django.conf import settings
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
                ('alias', models.CharField(blank=True,
                                           help_text='Alternative biosample name given by the collaborator or customer.',
                                           max_length=200, null=True)),
                ('collection_site',
                 models.CharField(help_text='The facility designated for the collection of samples.', max_length=200)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_biosample_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('individual',
                 models.ForeignKey(blank=True, help_text='Individual associated with the biosample.', null=True,
                                   on_delete=django.db.models.deletion.PROTECT, related_name='biosamples',
                                   to='fms_core.individual')),
                ('root_sample', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
                                                  related_name='biosamples', to='fms_core.sample')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_biosample_modification',
                                                 to=settings.AUTH_USER_MODEL)),
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
                ('experimental_group', models.JSONField(blank=True, default=list,
                                                        help_text='Sample group having some common characteristics. It is the way to designate a subgroup within a study.',
                                                        validators=[fms_core.schema_validators.JsonSchemaValidator(
                                                            {'$id': 'fms:experimental_group',
                                                             '$schema': 'http://json-schema.org/draft-07/schema#',
                                                             'description': 'Schema used to define experimental groups for a sample.',
                                                             'items': {'minLength': 1, 'type': 'string'},
                                                             'title': 'Experimental group schema', 'type': 'array',
                                                             'uniqueItems': True}, formats=None)])),
                ('tissue_source', models.CharField(blank=True,
                                                   choices=[('BAL', 'BAL'), ('Biopsy', 'Biopsy'), ('Blood', 'Blood'),
                                                            ('Cells', 'Cells'), ('Expectoration', 'Expectoration'),
                                                            ('Gargle', 'Gargle'), ('Plasma', 'Plasma'),
                                                            ('Saliva', 'Saliva'), ('Swab', 'Swab'), ('Tumor', 'Tumor'),
                                                            ('Buffy coat', 'Buffy coat'), ('Tail', 'Tail')],
                                                   help_text='Can only be specified if the biospecimen type is DNA or RNA.',
                                                   max_length=200)),
                ('library', models.CharField(blank=True, max_length=200, null=True)),
                ('index', models.CharField(blank=True, max_length=200, null=True)),
                ('biosample', models.ForeignKey(help_text='Biosample associated to this DerivedSample',
                                                on_delete=django.db.models.deletion.PROTECT,
                                                related_name='derived_samples', to='fms_core.biosample')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_derivedsample_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('sample_kind', models.ForeignKey(
                    help_text='Biological material collected from study subject during the conduct of a genomic study project.',
                    on_delete=django.db.models.deletion.PROTECT, to='fms_core.samplekind')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_derivedsample_modification',
                                                 to=settings.AUTH_USER_MODEL)),
                ('sample', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT,
                                             related_name='derived_samples', to='fms_core.sample')),
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
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_derivedbysample_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('derived_sample',
                 models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='derived_by_samples',
                                   to='fms_core.derivedsample')),
                ('sample',
                 models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='derived_by_samples',
                                   to='fms_core.sample')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_derivedbysample_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.RunSQL(
            """
                -- Create biosamples from parent samples and samples not having lineages (samples excluded are those who are children samples)
                INSERT INTO fms_core_biosample (individual_id, alias, collection_site, created_at, created_by_id, updated_at, updated_by_id, deleted, root_sample_id)
                SELECT sample.individual_id, sample.alias, sample.collection_site, sample.created_at, sample.created_by_id, current_timestamp, 1, FALSE, sample.id
                FROM fms_core_sample sample
                WHERE sample.id NOT IN (
                    SELECT child_id FROM fms_core_samplelineage
                );
            """,
            migrations.RunSQL.noop
        ),
        migrations.RunSQL(
            """
                --  Insert into DerivedSample data from samples that are not children samples
                INSERT INTO fms_core_derivedsample (biosample_id, sample_kind_id, experimental_group, tissue_source, created_at, created_by_id, updated_at, updated_by_id, deleted, sample_id)
                SELECT b.id, s.sample_kind_id, s.experimental_group, s.tissue_source, s.created_at, s.created_by_id, current_timestamp, 1, FALSE, s.id
                FROM fms_core_sample s
                JOIN fms_core_biosample b
                ON b.root_sample_id = s.id
                WHERE s.id NOT IN (SELECT child_id FROM fms_core_samplelineage);
            """,
            migrations.RunSQL.noop
        ),
        migrations.RunSQL(
            """
                --  Create DerivedBySample for samples that are not children samples
                INSERT INTO fms_core_derivedbysample (derived_sample_id, sample_id, volume_ratio, created_at, created_by_id, updated_at, updated_by_id, deleted)
                SELECT id, sample_id, 1, created_at, created_by_id, updated_at, updated_by_id, deleted
                FROM fms_core_derivedsample derivedsample
                WHERE derivedsample.sample_id NOT IN (SELECT child_id FROM fms_core_samplelineage);
            """,
            migrations.RunSQL.noop
        ),
        migrations.RunSQL(
            """
                -- Insert into DerivedSample data from children samples from samplelineage, except those related to Transfer process
                INSERT INTO fms_core_derivedsample (biosample_id, sample_kind_id, experimental_group, tissue_source, created_at, created_by_id, updated_at, updated_by_id, deleted, sample_id)
                SELECT t.biosample_id, s.sample_kind_id, s.experimental_group, s.tissue_source, s.created_at, s.created_by_id, current_timestamp, 1, FALSE, s.id
                FROM
                (
                    -- Recursive sample lineage CTE query
                    WITH RECURSIVE derived AS (
                        SELECT samplelineage.id AS id, samplelineage.parent_id, samplelineage.child_id, samplelineage.parent_id AS root_sample_id,
                               samplelineage.process_measurement_id
                        FROM fms_core_samplelineage samplelineage
                        WHERE samplelineage.parent_id IN
                              (SELECT id FROM fms_core_sample WHERE id NOT IN (SELECT child_id FROM fms_core_samplelineage))
                        UNION ALL
                             SELECT sl2.id AS id, sl2.parent_id, sl2.child_id, derived.root_sample_id, sl2.process_measurement_id
                             FROM fms_core_samplelineage sl2
                             JOIN derived
                                 ON derived.child_id = sl2.parent_id
                    )
                    -- Select samples that are children in some samplelineage
                    -- Ensure that they are not from samplelineage created from a Transfer process
                    SELECT derived.child_id AS sample_id, biosample.id AS biosample_id
                    FROM derived
                    JOIN fms_core_biosample biosample ON biosample.root_sample_id = derived.root_sample_id
                    JOIN fms_core_processmeasurement processmeasurement ON processmeasurement.id = derived.process_measurement_id
                    JOIN fms_core_process process ON process.id = processmeasurement.process_id
                    JOIN fms_core_protocol protocol ON protocol.id = process.protocol_id
                    WHERE protocol.name != 'Transfer'
                ) t
                -- Join sample to the sample from the samplelineage in order to get the sample attr to insert into the DerivedSample
                JOIN fms_core_sample s
                ON t.sample_id = s.id;
            """,
            migrations.RunSQL.noop
        ),
        migrations.RunSQL(
            """
                -- Create DerivedBySample based on SampleLineage hierarchy with children sample 
                INSERT INTO fms_core_derivedbysample (derived_sample_id, sample_id, volume_ratio, created_at, created_by_id, updated_at, updated_by_id, deleted)
                SELECT q.derivedsample_id, q.child_sample_id, 1, q.pm_created_at, q.pm_created_by_id, current_timestamp, 1, FALSE
                FROM (
                     -- Recursive sample lineage CTE query
                    WITH RECURSIVE derivedsamplelineage AS (
                    SELECT samplelineage.id AS id, samplelineage.parent_id, samplelineage.child_id, samplelineage.parent_id AS root_sample_id,
                           CASE
                                WHEN protocol.name = 'Transfer' THEN samplelineage.parent_id
                                ELSE samplelineage.child_id
                           END AS source_id,
                           CASE
                                WHEN protocol.name = 'Transfer' THEN FALSE
                                ELSE TRUE
                           END AS original,
                           samplelineage.process_measurement_id,
                           processmeasurement.created_at AS pm_created_at, processmeasurement.created_by_id AS pm_created_by_id,
                           protocol.name AS protocol_name, 0 AS level
                    FROM fms_core_samplelineage samplelineage
                    JOIN fms_core_processmeasurement processmeasurement ON processmeasurement.id = samplelineage.process_measurement_id
                    JOIN fms_core_process process ON process.id = processmeasurement.process_id
                    JOIN fms_core_protocol protocol ON protocol.id = process.protocol_id
                    WHERE samplelineage.parent_id IN
                          (SELECT id FROM fms_core_sample WHERE id NOT IN (SELECT child_id FROM fms_core_samplelineage))
                    UNION ALL
                         SELECT sl2.id AS id, sl2.parent_id, sl2.child_id, derivedsamplelineage.root_sample_id,
                                CASE
                                    WHEN protocol.name = 'Transfer' THEN derivedsamplelineage.source_id
                                    ELSE sl2.child_id
                                END AS source_id,
                                CASE
                                    WHEN protocol.name = 'Transfer' THEN FALSE
                                    ELSE TRUE
                                END AS original,
                                sl2.process_measurement_id,
                                processmeasurement.created_at AS pm_created_at, processmeasurement.created_by_id AS pm_created_by_id,
                                protocol.name AS protocol_name, derivedsamplelineage.level + 1
                         FROM fms_core_samplelineage sl2
                         JOIN derivedsamplelineage ON derivedsamplelineage.child_id = sl2.parent_id
                         JOIN fms_core_processmeasurement processmeasurement ON processmeasurement.id = sl2.process_measurement_id
                         JOIN fms_core_process process ON process.id = processmeasurement.process_id
                         JOIN fms_core_protocol protocol ON protocol.id = process.protocol_id
                
                    )
                    SELECT derivedsamplelineage.id AS samplelineage_id,
                           derivedsamplelineage.child_id AS child_sample_id,
                           derivedsamplelineage.root_sample_id AS root_sample_id,
                           derivedsamplelineage.protocol_name,
                           derivedsamplelineage.source_id AS sample_source_id,
                           derivedsample.id AS derivedsample_id,
                           derivedsamplelineage.original AS is_original_derivedsample,
                           derivedsamplelineage.level AS level,
                           derivedsamplelineage.pm_created_at,
                           derivedsamplelineage.pm_created_by_id
                    FROM derivedsamplelineage
                    JOIN fms_core_derivedsample derivedsample ON derivedsample.sample_id = derivedsamplelineage.source_id
                ) q;
            """
        ),

        migrations.RemoveField(
            model_name='biosample',
            name='root_sample',
        ),
        migrations.RemoveField(
            model_name='derivedsample',
            name='sample',
        ),
        migrations.RemoveField(
            model_name='sample',
            name='alias',
        ),
        migrations.RemoveField(
            model_name='sample',
            name='collection_site',
        ),
        migrations.RemoveField(
            model_name='sample',
            name='experimental_group',
        ),
        migrations.RemoveField(
            model_name='sample',
            name='individual',
        ),
        migrations.RemoveField(
            model_name='sample',
            name='sample_kind',
        ),
        migrations.RemoveField(
            model_name='sample',
            name='tissue_source',
        ),
        migrations.RemoveField(
            model_name='sample',
            name='phenotype',
        ),
        migrations.RemoveField(
            model_name='sample',
            name='update_comment',
        ),
        migrations.DeleteModel(
            name='ContainerMove',
        ),
        migrations.DeleteModel(
            name='ContainerRename',
        ),
        migrations.DeleteModel(
            name='ExtractedSample',
        ),
        migrations.DeleteModel(
            name='SampleUpdate',
        ),
        migrations.DeleteModel(
            name='TransferredSample',
        ),
        migrations.AddField(
            model_name='sample',
            name='derived_samples',
            field=models.ManyToManyField(blank=True, related_name='samples', through='fms_core.DerivedBySample', to='fms_core.DerivedSample'),
        ),
        migrations.AlterField(
            model_name='derivedbysample',
            name='volume_ratio',
            field=models.DecimalField(decimal_places=3, help_text='Volume ratio in pools.', max_digits=4),
        ),
        migrations.AlterField(
            model_name='propertytype',
            name='is_optional',
            field=models.BooleanField(default=False, help_text='Whether this property is optional or not.'),
        ),
        migrations.AlterField(
            model_name='propertytype',
            name='name',
            field=models.CharField(help_text='The name of the property.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))]),
        ),
        migrations.AlterField(
            model_name='propertytype',
            name='value_type',
            field=models.CharField(choices=[('int', 'int'), ('float', 'float'), ('bool', 'bool'), ('str', 'str')], help_text='Enumerated type to define value type.', max_length=20),
        ),
        migrations.AlterField(
            model_name='sample',
            name='comment',
            field=models.TextField(blank=True, help_text='Other relevant information about the biosample.'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='concentration',
            field=models.DecimalField(blank=True, decimal_places=3, help_text='Concentration in ng/µL. Required for DNA).', max_digits=20, null=True, verbose_name='concentration in ng/µL'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='container',
            field=models.ForeignKey(help_text='Container in which the sample is placed.', limit_choices_to={'kind__in': ('infinium gs 24 beadchip', 'tube', 'tube strip 2x1', 'tube strip 3x1', 'tube strip 4x1', 'tube strip 5x1', 'tube strip 6x1', 'tube strip 7x1', 'tube strip 8x1', '96-well plate', '384-well plate')}, on_delete=django.db.models.deletion.PROTECT, related_name='samples', to='fms_core.container'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='coordinates',
            field=models.CharField(blank=True, help_text='Coordinates of the sample in a sample holding container. Only applicable for containers that directly store samples with coordinates, e.g. plates.', max_length=10),
        ),
        migrations.AlterField(
            model_name='sample',
            name='volume',
            field=models.DecimalField(decimal_places=3, help_text='Current volume of the sample, in µL.', max_digits=20),
        ),
        migrations.AlterField(
            model_name='samplekind',
            name='molecule_ontology_curie',
            field=models.CharField(blank=True, help_text='SO ontology term to describe an molecule, such as ‘SO:0000991’ (‘genomic_DNA’).', max_length=20),
        ),
        migrations.AlterField(
            model_name='samplelineage',
            name='child',
            field=models.ForeignKey(help_text='Child sample.', on_delete=django.db.models.deletion.CASCADE, related_name='child_sample', to='fms_core.sample'),
        ),
        migrations.AlterField(
            model_name='samplelineage',
            name='parent',
            field=models.ForeignKey(help_text='Parent sample.', on_delete=django.db.models.deletion.CASCADE, related_name='parent_sample', to='fms_core.sample'),
        ),
        migrations.AlterField(
            model_name='samplelineage',
            name='process_measurement',
            field=models.ForeignKey(help_text='process used for sample creation.', on_delete=django.db.models.deletion.PROTECT, related_name='lineage', to='fms_core.processmeasurement'),
        ),
    ]
