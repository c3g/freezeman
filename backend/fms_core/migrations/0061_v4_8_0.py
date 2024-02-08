from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0060_v4_7_0'),
    ]

    operations = [
        migrations.AlterField(
            model_name='propertytype',
            name='object_id',
            field=models.BigIntegerField(),
        ),
        migrations.AlterField(
            model_name='propertyvalue',
            name='object_id',
            field=models.BigIntegerField(),
        ),
        migrations.CreateModel(
            name='ArchivedComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('object_id', models.BigIntegerField()),
                ('comment', models.TextField(help_text='Comment to be archived.')),
                ('content_type', models.ForeignKey(limit_choices_to=models.Q(('app_label', 'fms_core'), ('model', 'dataset')), on_delete=django.db.models.deletion.PROTECT, to='contenttypes.contenttype')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
