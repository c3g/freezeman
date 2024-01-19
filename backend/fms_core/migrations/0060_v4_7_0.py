import reversion
from django.contrib.auth.models import User
from django.db import migrations, models

ADMIN_USERNAME = 'biobankadmin'
def set_steps_without_placement(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")

    STEPS_WITHOUT_PLACEMENT = ["Experiment Run Illumina",   # TEMPORARY UNTIL UI READY
                               "Experiment Run DNBSEQ",     # TEMPORARY UNTIL UI READY
                               "Experiment Run Infinium",   # TEMPORARY UNTIL UI READY
                               "Experiment Run Axiom",      # TEMPORARY UNTIL UI READY
                               "Normalization and Pooling", # TEMPORARY UNTIL UI READY
                               "Sample QC",
                               "Library QC",
                               "Axiom Sample Preparation",
                               "Axiom Create Folders",
                               "Quality Control - Integration (Spark)"]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        
        reversion.set_comment("Set needs_placement to false for steps that do not require placement.")
        reversion.set_user(admin_user)

        for name in STEPS_WITHOUT_PLACEMENT:
            step = Step.objects.get(name=name)
            step.needs_placement = False
            step.save()
            reversion.add_to_revision(step)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0059_v4_6_2'),
    ]

    operations = [
        migrations.AddField(
            model_name='step',
            name='needs_placement',
            field=models.BooleanField(default=True, help_text='Samples on this step need a destination container and coordinates assigned.'),
        ),
        migrations.RunPython(
            set_steps_without_placement,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
