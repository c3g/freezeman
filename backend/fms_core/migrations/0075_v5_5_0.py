from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import re


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0074_v5_3_1'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='sampleidentitymatch',
            name='sampleidentitymatch_testedid_matchedid_key',
        ),
        migrations.AddField(
            model_name='sampleidentitymatch',
            name='readset',
            field=models.ForeignKey(blank=True, help_text='Match found by comparing sequencing data to identity signature.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='readset_identity_match', to='fms_core.readset'),
        ),
        migrations.AddConstraint(
            model_name='sampleidentitymatch',
            constraint=models.UniqueConstraint(fields=('tested_id', 'matched_id', 'readset_id'), name='sampleidentitymatch_testedid_matchedid_readsetid_key'),
        ),
        migrations.CreateModel(
            name='FreezemanPermission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='Name given as identifier to a permission.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('description', models.TextField(help_text='Short description of the permission.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='FreezemanPermissionByUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_creation', to=settings.AUTH_USER_MODEL)),
                ('freezeman_permission', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='users_by_permission', to='fms_core.freezemanpermission')),
                ('freezeman_user', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='permissions_by_user', to='fms_core.freezemanuser')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name='freezemanpermissionbyuser',
            constraint=models.UniqueConstraint(fields=('freezeman_permission_id', 'freezeman_user_id'), name='freezemanpermissionbyuser_permissionid_userid_key'),
        ),
        migrations.AddIndex(
            model_name='freezemanpermission',
            index=models.Index(fields=['name'], name='freezemanpermission_name_idx'),
        ),
         migrations.AddField(
            model_name='freezemanuser',
            name='permissions',
            field=models.ManyToManyField(blank=True, related_name='freezeman_users', through='fms_core.FreezemanPermissionByUser', to='fms_core.freezemanpermission'),
        ),
        migrations.AddIndex(
            model_name='index',
            index=models.Index(fields=['name'], name='index_name_idx'),
        ),
        migrations.AddIndex(
            model_name='librarytype',
            index=models.Index(fields=['name'], name='librarytype_name_idx'),
        ),
    ]
