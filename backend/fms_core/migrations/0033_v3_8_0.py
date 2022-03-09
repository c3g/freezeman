from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import re


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0032_v3_7_0'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='derivedsample',
            name='index',
        ),
        migrations.CreateModel(
            name='LibraryType',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='The name of the library type.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_librarytype_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_librarytype_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Library',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('library_size', models.DecimalField(blank=True, decimal_places=0, help_text='Average size of the nucleic acid strands in base pairs.', max_digits=20, null=True)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_library_creation', to=settings.AUTH_USER_MODEL)),
                ('index', models.ForeignKey(help_text='The index associated to this library.', on_delete=django.db.models.deletion.PROTECT, related_name='libraries', to='fms_core.index')),
                ('library_type', models.ForeignKey(help_text='Library type describing the library.', on_delete=django.db.models.deletion.PROTECT, related_name='libraries', to='fms_core.librarytype')),
                ('platform', models.ForeignKey(help_text='The platform for which the library has been prepared.', on_delete=django.db.models.deletion.PROTECT, related_name='libraries', to='fms_core.platform')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_library_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='derivedsample',
            name='library',
            field=models.ForeignKey(blank=True, help_text='Library associated to this Derived Sample.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='derived_sample', to='fms_core.library'),
        ),
    ]
