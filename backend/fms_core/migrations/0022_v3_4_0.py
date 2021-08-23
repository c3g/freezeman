from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import re

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0021_v3_3_0'),
    ]

    operations = [
        migrations.AlterField(
            model_name='container',
            name='barcode',
            field=models.CharField(help_text='Unique container barcode.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[\\S]{1,200}$'))]),
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='The name of the project.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('principal_investigator', models.CharField(blank=True, help_text='The principal investigator of the project.', max_length=200)),
                ('requestor_name', models.CharField(blank=True, help_text='The name of the requestor of the project.', max_length=200)),
                ('requestor_email', models.CharField(blank=True, help_text='The email of the requestor of the project.', max_length=200, validators=[django.core.validators.EmailValidator()])),
                ('targeted_end_date', models.DateField(blank=True, null=True, help_text='Targeted date to conclude the project.')),
                ('status', models.CharField(choices=[('Ongoing', 'Ongoing'), ('Completed', 'Completed')], help_text='The status of the project.', max_length=20)),
                ('comments', models.TextField(blank=True, help_text='Other relevant information about the project.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_project_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_project_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AlterField(
            model_name='sample',
            name='individual',
            field=models.ForeignKey(blank=True, help_text='Individual associated with the sample.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='samples', to='fms_core.individual'),
        ),
    ]
