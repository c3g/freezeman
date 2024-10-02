from django.conf import settings
from django.db import migrations
from django.contrib.auth.models import User
import reversion

from fms_core.models import StepOrder, SampleNextStep, Step, Protocol, StepSpecification, SampleNextStepByStudy, Workflow, Study

ADMIN_USERNAME = 'biobankadmin'

def add_sample_qc_distinction_dna_rna(apps, schema_editor):

    STEPS = [
        {"name": "Sample QC (DNA)", "protocol_name": "Sample Quality Control","expected_sample_type": "EXTRACTED_SAMPLE",
          "specifications": [
            {"display_name": "SampleQcType", "sheet_name": "SampleQC", "column_name": "Sample Kind", "value": "DNA"}]
        },
        {"name": "Sample QC (RNA)", "protocol_name": "Sample Quality Control","expected_sample_type": "EXTRACTED_SAMPLE",
          "specifications": [
            {"display_name": "SampleQcType", "sheet_name": "SampleQC", "column_name": "Sample Kind", "value": "RNA"}]
        }
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create Sample QC DNA and RNA step and transfer existing Sample QC data to their respective new step.")
        reversion.set_user(admin_user)
        for step_info in STEPS:
            protocol = Protocol.objects.get(name=step_info["protocol_name"])
            step = Step.objects.create(name=step_info["name"],
                                       protocol_id=protocol.id,
                                       type="PROTOCOL",
                                       needs_placement=False,
                                       needs_planning=False,
                                       expected_sample_type=step_info["expected_sample_type"],
                                       created_by_id=admin_user.id,
                                       updated_by_id=admin_user.id)
            reversion.add_to_revision(step)
            for specification in step_info["specifications"]:
                step_specification = StepSpecification.objects.create(name=specification["display_name"],
                                                                      sheet_name=specification["sheet_name"],
                                                                      column_name=specification["column_name"],
                                                                      value=specification["value"],
                                                                      step=step,
                                                                      created_by_id=admin_user.id,
                                                                      updated_by_id=admin_user.id)
                reversion.add_to_revision(step_specification)
        oldStep = Step.objects.get(name="Sample QC")
        dnaStep = Step.objects.get(name="Sample QC (RNA)")
        rnaStep = Step.objects.get(name="Sample QC (DNA)")

        if oldStep:
            sns = SampleNextStep.objects.filter(step__id=oldStep.id)
            for sampleNextStep in sns:
                updatedSampleNextStep = SampleNextStep.objects.get(id=sampleNextStep.id)
                sampleNextStepByStudy = SampleNextStepByStudy.objects.get(sample_next_step__id=sampleNextStep.id)
                stepOrder = StepOrder.objects.get(id=sampleNextStepByStudy.step_order.id)
                if sampleNextStep.sample.derived_samples.first().sample_kind.name == "DNA":
                  updatedSampleNextStep.step = dnaStep
                  stepOrder.step = rnaStep
                elif sampleNextStep.sample.derived_samples.first().sample_kind.name == "RNA":
                  updatedSampleNextStep.step = rnaStep
                  stepOrder.step = dnaStep
                stepOrder.save()
                updatedSampleNextStep.save()
                reversion.add_to_revision(sampleNextStep)
                reversion.add_to_revision(stepOrder)
            so = StepOrder.objects.filter(step__id=oldStep.id)
            for order in so:
                stepOrder = StepOrder.objects.get(id=order.id)
                if "DNA" in order.previous_step_order.all().first().step.name:
                    stepOrder.step = dnaStep
                elif "RNA" in order.previous_step_order.all().first().step.name:
                    stepOrder.step = rnaStep
                stepOrder.save()
            so = StepOrder.objects.filter(step__id=oldStep.id)
            if len(so) == 0:
              oldStep.delete()
              reversion.add_to_revision(oldStep)


class Migration(migrations.Migration):

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL),('fms_core', '0065_v4_12_0')]
    operations = [migrations.RunPython(add_sample_qc_distinction_dna_rna,reverse_code=migrations.RunPython.noop)]
