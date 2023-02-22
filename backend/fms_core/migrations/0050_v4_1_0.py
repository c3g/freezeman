from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

def add_qpcr_instrument_type(apps, schema_editor):
    Platform = apps.get_model("fms_core", "Platform")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Add a new library QC instrument : qPCR.")
        reversion.set_user(admin_user)
        platform_qc = Platform.objects.get(name="Quality Control")
        instrument_type = InstrumentType.objects.create(type="qPCR",
                                                        platform_id=platform_qc.id,
                                                        index_read_3_prime="FORWARD",
                                                        index_read_5_prime="FORWARD",
                                                        created_by_id=admin_user_id,
                                                        updated_by_id=admin_user_id)
        reversion.add_to_revision(instrument_type)

def additional_step(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Protocol = apps.get_model("fms_core", "Protocol")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")

    STEPS = [
        # {name, protocol_name, specifications}
        {"name": "Experiment Run Infinium", "protocol_name": "Illumina Infinium Preparation",
         "specifications": []},
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Add an additional step for Illumina Infinium Preparation.")
        reversion.set_user(admin_user)

        for step_info in STEPS:
            protocol = Protocol.objects.get(name=step_info["protocol_name"])

            step = Step.objects.create(name=step_info["name"],
                                       protocol=protocol,
                                       created_by_id=admin_user_id,
                                       updated_by_id=admin_user_id)
            
            reversion.add_to_revision(step)

            for specification in step_info["specifications"]:
                step_specification = StepSpecification.objects.create(display_name=specification["display_name"],
                                                                      sheet_name=specification["sheet_name"],
                                                                      column_name=specification["column_name"],
                                                                      value=specification["value"],
                                                                      step=step,
                                                                      created_by_id=admin_user_id,
                                                                      updated_by_id=admin_user_id)

                reversion.add_to_revision(step_specification)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0049_v4_0_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='StepHistory',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_stephistory_creation', to=settings.AUTH_USER_MODEL)),
                ('process_measurement', models.ForeignKey(help_text='Process measurement associated to the study step.', on_delete=django.db.models.deletion.PROTECT, related_name='StepHistory', to='fms_core.processmeasurement')),
                ('step_order', models.ForeignKey(help_text='Step order in the study that is associated to the process measurement.', on_delete=django.db.models.deletion.PROTECT, related_name='StepHistory', to='fms_core.steporder')),
                ('study', models.ForeignKey(help_text='Study associated to the process measurement.', on_delete=django.db.models.deletion.PROTECT, related_name='StepHistory', to='fms_core.study')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_stephistory_modification', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name='stephistory',
            constraint=models.UniqueConstraint(fields=('study', 'step_order', 'process_measurement'), name='stephistory_study_steporder_processmeasurement_key'),
        ),
        migrations.RunPython(
            additional_step,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveConstraint(
            model_name='samplenextstep',
            name='samplenextstep_steporder_sample_study_key',
        ),
        migrations.RemoveField(
            model_name='samplenextstep',
            name='study',
        ),
        migrations.RemoveField(
            model_name='samplenextstep',
            name='step_order',
        ),
        migrations.AddField(
            model_name='samplenextstep',
            name='step',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='samples_next_step', to='fms_core.step',
                                    help_text='The next step a sample has to complete in the study.'),
        ),
        migrations.CreateModel(
            name='SampleNextStepByStudy',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_samplenextstepbystudy_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_samplenextstepbystudy_modification', to=settings.AUTH_USER_MODEL)),
                ('study', models.ForeignKey(help_text='Study associated to the sample next step instance.', on_delete=django.db.models.deletion.PROTECT, related_name='sample_next_step_by_study', to='fms_core.study')),
                ('step_order', models.ForeignKey(help_text='Step order for the sample queued to a given study.', on_delete=django.db.models.deletion.PROTECT, related_name='sample_next_step_by_study', to='fms_core.steporder')),
                ('sample_next_step', models.ForeignKey(help_text='Sample next step associated to the study instance.', on_delete=django.db.models.deletion.PROTECT, related_name='sample_next_step_by_study', to='fms_core.samplenextstep')),
            ],
        ),
        migrations.AddConstraint(
            model_name='samplenextstepbystudy',
            constraint=models.UniqueConstraint(fields=('study_id', 'step_order_id', 'sample_next_step_id'), name='samplenextstepbystudy_studyid_steporderid_samplenextstepid_key'),
        ),
        migrations.AddConstraint(
            model_name='samplenextstep',
            constraint=models.UniqueConstraint(fields=('step_id', 'sample_id'), name='samplenextstep_stepid_sampleid_key'),
        ),
        migrations.AddField(
            model_name='samplenextstep',
            name='studies',
            field=models.ManyToManyField(blank=True, related_name='samples_next_steps', through='fms_core.SampleNextStepByStudy', to='fms_core.Study'),
        ),
        migrations.RunPython(
            add_qpcr_instrument_type,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
