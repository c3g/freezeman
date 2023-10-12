import reversion
from django.contrib.auth.models import User

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from fms_core.models._constants import SampleType

ADMIN_USERNAME = 'biobankadmin'

def create_axiom_automation_step(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create Axiom Create Folders automation step and specification.")
        reversion.set_user(admin_user)

        STEPS = [
            # {name, protocol_name}
            {"name": "Axiom Create Folders", "expected_sample_type": SampleType.EXTRACTED_SAMPLE,
             "specifications": [{"display_name": "Automation class", "value": "AxiomCreateFolders"}]},
        ]

        # Create Step and specification
        for step_info in STEPS:
            step = Step.objects.create(name=step_info["name"],
                                       expected_sample_type=step_info["expected_sample_type"],
                                       created_by_id=admin_user_id,
                                       updated_by_id=admin_user_id)

            reversion.add_to_revision(step)

            for specification in step_info["specifications"]:
                step_specification = StepSpecification.objects.create(display_name=specification["display_name"],
                                                                      value=specification["value"],
                                                                      step=step,
                                                                      created_by_id=admin_user_id,
                                                                      updated_by_id=admin_user_id)

                reversion.add_to_revision(step_specification)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0057_v4_5_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='step',
            name='type',
            field=models.CharField(choices=[('PROTOCOL', 'Protocol'), ('AUTOMATION', 'Automation')], default='PROTOCOL', help_text='Type of step.', max_length=200),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='step',
            name='protocol',
            field=models.ForeignKey(blank=True, help_text='Protocol for the step.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='steps', to='fms_core.protocol'),
        ),
        migrations.AlterField(
            model_name='stepspecification',
            name='column_name',
            field=models.CharField(blank=True, help_text='Name of the step template column.', max_length=200, null=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))]),
        ),
        migrations.AlterField(
            model_name='stepspecification',
            name='sheet_name',
            field=models.CharField(blank=True, help_text='Name of the step template sheet.', max_length=200, null=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))]),
        ),
        migrations.RunPython(
            create_axiom_automation_step,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
