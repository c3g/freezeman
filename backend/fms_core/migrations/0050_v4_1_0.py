from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0049_v4_0_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='StudyStepOrderByMeasurement',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_studysteporderbymeasurement_creation', to=settings.AUTH_USER_MODEL)),
                ('process_measurement', models.ForeignKey(help_text='Process measurement associated to the study step.', on_delete=django.db.models.deletion.PROTECT, related_name='StudyStepOrderByMeasurement', to='fms_core.processmeasurement')),
                ('step_order', models.ForeignKey(help_text='Step order in the study that is associated to the process measurement.', on_delete=django.db.models.deletion.PROTECT, related_name='StudyStepOrderByMeasurement', to='fms_core.steporder')),
                ('study', models.ForeignKey(help_text='Study associated to the process measurement.', on_delete=django.db.models.deletion.PROTECT, related_name='StudyStepOrderByMeasurement', to='fms_core.study')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_studysteporderbymeasurement_modification', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name='studysteporderbymeasurement',
            constraint=models.UniqueConstraint(fields=('study', 'step_order', 'process_measurement'), name='studysteporderbymeasurement_study_steporder_processmeasurement_key'),
        ),
    ]
