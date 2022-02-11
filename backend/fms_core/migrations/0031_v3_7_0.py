# Generated by Django 3.1 on 2022-02-10 15:55

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import re


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0030_v3_6_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='Sequence',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('value', models.CharField(help_text='The nucleotide string defining the sequence.', max_length=500, unique=True,
                                           validators=[django.core.validators.RegexValidator(re.compile('^[ATCGU]{1,500}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_sequence_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_sequence_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='IndexStructure',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='The name of the index structure.', max_length=200, unique=True,
                                          validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_indexstructure_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('flanker_3prime_forward', models.ForeignKey(help_text="Flanker on the 3 prime forward direction",
                                                             on_delete=django.db.models.deletion.PROTECT,
                                                             related_name='flanker_3prime_forward',
                                                             to='fms_core.sequence')),
                ('flanker_3prime_reverse', models.ForeignKey(help_text="Flanker on the 3 prime reverse direction",
                                                             on_delete=django.db.models.deletion.PROTECT,
                                                             related_name='flanker_3prime_reverse',
                                                             to='fms_core.sequence')),
                ('flanker_5prime_forward', models.ForeignKey(help_text="Flanker on the 5 prime forward direction",
                                                             on_delete=django.db.models.deletion.PROTECT,
                                                             related_name='flanker_5prime_forward',
                                                             to='fms_core.sequence')),
                ('flanker_5prime_reverse', models.ForeignKey(help_text="Flanker on the 5 prime reverse direction",
                                                             on_delete=django.db.models.deletion.PROTECT,
                                                             related_name='flanker_5prime_reverse',
                                                             to='fms_core.sequence')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_indexstructure_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='IndexSet',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='The name of the index set.', max_length=200, unique=True,
                                          validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_indexset_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_indexset_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Index',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='The name of the index.', max_length=200, unique=True,
                                          validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('index_set', models.ForeignKey(help_text='The set which this index belongs to', blank=True, null=True,
                                                on_delete=django.db.models.deletion.PROTECT, related_name='indices',
                                                to='fms_core.indexset')),
                ('index_structure', models.ForeignKey(help_text='The index structure of the index',
                                                      on_delete=django.db.models.deletion.PROTECT,
                                                      related_name='indices', to='fms_core.indexstructure')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_index_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_index_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SequenceByIndex5Prime',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_sequencebyindex5prime_creation', to=settings.AUTH_USER_MODEL)),
                ('index', models.ForeignKey(help_text='5 primer indices associated', on_delete=django.db.models.deletion.CASCADE, related_name='sequence_5prime_association', to='fms_core.index')),
                ('sequence', models.ForeignKey(help_text='Sequences associated', on_delete=django.db.models.deletion.CASCADE, related_name='index_5prime_association', to='fms_core.sequence')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_sequencebyindex5prime_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SequenceByIndex3Prime',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_sequencebyindex3prime_creation', to=settings.AUTH_USER_MODEL)),
                ('index', models.ForeignKey(help_text='3 primer indices associated', on_delete=django.db.models.deletion.CASCADE, related_name='sequence_3prime_association', to='fms_core.index')),
                ('sequence', models.ForeignKey(help_text='Sequences associated', on_delete=django.db.models.deletion.CASCADE, related_name='index_3prime_association', to='fms_core.sequence')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_sequencebyindex3prime_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='derivedsample',
            name='index',
            field=models.ForeignKey(help_text='Index associated to this Derived Sample', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='derived_samples', to='fms_core.index'),
        ),
        migrations.AddField(
            model_name='index',
            name='sequences_3prime',
            field=models.ManyToManyField(related_name='indices_3prime', through='fms_core.SequenceByIndex3Prime', to='fms_core.Sequence')
        ),
        migrations.AddField(
            model_name='index',
            name='sequences_5prime',
            field=models.ManyToManyField(related_name='indices_5prime', through='fms_core.SequenceByIndex5Prime', to='fms_core.Sequence')
        ),
    ]
