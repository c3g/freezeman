from django.conf import settings
from django.db import migrations
from django.contrib.auth.models import User
import reversion

from fms_core.models import StepOrder, SampleNextStep

ADMIN_USERNAME = 'biobankadmin'

def add_sample_qc_distinction_dna_rna(self, apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Protocol = apps.get_model("fms_core", "Protocol")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")

    STEPS = [
        {"name": "Sample QC (DNA)", "protocol_name": "Sample QC", "specifications": [
            {"display_name": "Sample QC Type", "sheet_name": "SampleQC", "column_name": "Sample Kind", "value": "DNA"}]
        },
        {"name": "Sample QC (RNA)", "protocol_name": "Sample QC", "specifications": [
            {"display_name": "Sample QC Type", "sheet_name": "SampleQC", "column_name": "Sample Kind", "value": "RNA"}]
        }
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create Sample QC DNA and RNA step and transfer existing Sample QC data to their respective new step.")
        reversion.set_user(admin_user)
        for step_info in STEPS:
            protocol = Protocol.objects.get(name=step_info["protocol_name"])
            step = Step.objects.create(name=step_info["name"],
                                       protocol=protocol,
                                       created_by_id=admin_user.id,
                                       updated_by_id=admin_user.id)
            reversion.add_to_revision(step)
            for specification in step_info["specifications"]:
                step_specification = StepSpecification.objects.create(display_name=specification["display_name"],
                                                                      sheet_name=specification["sheet_name"],
                                                                      column_name=specification["column_name"],
                                                                      value=specification["value"],
                                                                      step=step,
                                                                      created_by_id=admin_user.id,
                                                                      updated_by_id=admin_user.id)
                reversion.add_to_revision(step_specification)
        oldStep = Step.objects.get(name="Sample QC")
        dnaStep = Step.objects.get(name="Sample QC (DNA)")
        if oldStep:
            rnaStep = Step.objects.get(name="Sample QC (RNA)")
            sns = SampleNextStep.objects.filter(step__id=oldStep.id)
            for sampleNextStep in sns:
                sampleNextStep.update(step=rnaStep)
                sampleNextStep.save()
                reversion.add_to_revision(sampleNextStep)


            so = StepOrder.objects.filter(step__id=step.id).update(step=rnaStep)
            for stepOrder in so:
                stepOrder.update(step=rnaStep)
                stepOrder.save()
                reversion.add_to_revision(stepOrder)
            if self.assertNotEquals(sns, 0):
              step.delete()


class Migration(migrations.Migration):

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL),('fms_core', '0064_v4_11_0')]
    operations = [migrations.RunPython(add_sample_qc_distinction_dna_rna,reverse_code=migrations.RunPython.noop)]
