from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import reversion

from fms_core.models._constants import SampleType

ADMIN_USERNAME = 'biobankadmin'

def initialize_step_expected_sample_type(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")

    STEPS = [
        {"name": "Extraction (DNA)", "expected_type": SampleType.UNEXTRACTED_SAMPLE},
        {"name": "Extraction (RNA)", "expected_type": SampleType.UNEXTRACTED_SAMPLE},
        {"name": "Sample QC", "expected_type": SampleType.EXTRACTED_SAMPLE},
        {"name": "Normalization (Sample)", "expected_type": SampleType.EXTRACTED_SAMPLE},
        {"name": "Normalization (Library)", "expected_type": SampleType.LIBRARY},
        {"name": "Library Preparation (PCR-free, Illumina)", "expected_type": SampleType.EXTRACTED_SAMPLE},
        {"name": "Library Preparation (PCR-enriched, Illumina)", "expected_type": SampleType.EXTRACTED_SAMPLE},
        {"name": "Library Preparation (RNASeq, Illumina)", "expected_type": SampleType.EXTRACTED_SAMPLE},
        {"name": "Library Preparation (WGBS, Illumina)", "expected_type": SampleType.EXTRACTED_SAMPLE},
        {"name": "Library Preparation (miRNA, Illumina)", "expected_type": SampleType.EXTRACTED_SAMPLE},
        {"name": "Library Preparation (PCR-free, DNBSEQ)", "expected_type": SampleType.EXTRACTED_SAMPLE},
        {"name": "Library QC", "expected_type": SampleType.LIBRARY},
        {"name": "Pooling", "expected_type": SampleType.LIBRARY},
        {"name": "Experiment Run Illumina", "expected_type": SampleType.LIBRARY},
        {"name": "Experiment Run DNBSEQ", "expected_type": SampleType.LIBRARY},
        {"name": "Library Conversion (DNBSEQ)", "expected_type": SampleType.LIBRARY},
        {"name": "Library Capture (MCC)", "expected_type": SampleType.LIBRARY},
        {"name": "Library Capture (Exome)", "expected_type": SampleType.LIBRARY},
        {"name": "Experiment Run Infinium", "expected_type": SampleType.EXTRACTED_SAMPLE},
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Set for each step an appropriate expected sample type.")
        reversion.set_user(admin_user)

        for step_sample_type in STEPS:
            step = Step.objects.get(name=step_sample_type["name"])
            step.expected_sample_type = step_sample_type["expected_type"]
            step.save()

            reversion.add_to_revision(step)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0050_v4_1_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='step',
            name='expected_sample_type',
            field=models.CharField(choices=[('ANY', 'Any'), ('UNEXTRACTED_SAMPLE', 'Unextracted sample'), ('EXTRACTED_SAMPLE', 'Extracted sample'), ('SAMPLE', 'Sample'), ('LIBRARY', 'Library'), ('POOL', 'Pooled library')], default='ANY', help_text='The acceptable sample type for the step.', max_length=200),
        ),
        migrations.RunPython(
            initialize_step_expected_sample_type,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
