import reversion
from django.db import migrations, models
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def initialize_web_form_steps(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")

    WEB_FORM_STEPS = ["Library QC", "Sample QC (DNA)", "Sample QC (RNA)"]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Set use_web_form to True for QC steps.")
        reversion.set_user(admin_user)

        for step in Step.objects.filter(name__in=WEB_FORM_STEPS):
            step.use_web_form = True
            step.save()
            reversion.add_to_revision(step)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0069_v5_0_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='step',
            name='use_web_form',
            field=models.BooleanField(default=False, help_text='Step uses a custom web form to build a json template.'),
        ),
        migrations.RunPython(
            initialize_web_form_steps,
            reverse_code=migrations.RunPython.noop,
        ),
    ]