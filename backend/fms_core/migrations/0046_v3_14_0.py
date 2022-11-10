from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import re


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0045_v3_13_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='LibrarySelection',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='The name of the library selection protocol.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('target', models.CharField(help_text='The target of the selection protocol.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_libraryselection_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_libraryselection_modification', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='library',
            name='library_selection',
            field=models.ForeignKey(blank=True, help_text='Library selection used on the library.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='libraries', to='fms_core.libraryselection'),
        ),
        migrations.AddConstraint(
            model_name='libraryselection',
            constraint=models.UniqueConstraint(fields=('name', 'target'), name='libraryselection_name_target_key'),
        ),
    ]
