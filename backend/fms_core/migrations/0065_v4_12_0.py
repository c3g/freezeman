<<<<<<< HEAD
from django.conf import settings
from django.db import migrations
from django.contrib.auth.models import User
import reversion

from fms_core.models import StepOrder, SampleNextStep, Step, Protocol, StepSpecification, SampleNextStepByStudy, Workflow, Study

ADMIN_USERNAME = 'biobankadmin'

def add_sample_qc_distinction_dna_rna(self, apps, schema_editor):

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
        if oldStep:
            sns = SampleNextStep.objects.filter(step__id=oldStep.id)
            for sampleNextStep in sns:
                sampleNextStepByStudy = SampleNextStepByStudy.objects.get(sample_next_step__id=sampleNextStep.id)
                stepOrder = StepOrder.objects.get(id=sampleNextStepByStudy.step_order.id)
                if sampleNextStep.sample.derived_samples.first().sample_kind.name == "RNA":
                  newStep = Step.objects.get(name="Sample QC (RNA)")
                if sampleNextStep.sample.derived_samples.first().sample_kind.name == "DNA":
                  newStep = Step.objects.get(name="Sample QC (DNA)")
                sampleNextStep.update(step=newStep)
                stepOrder.update(step=newStep)
                sampleNextStep.save()
                reversion.add_to_revision(sampleNextStep)
                stepOrder.save()
                reversion.add_to_revision(stepOrder)
            if self.assertNotEquals(sns, 0):
              oldStep.delete()
=======
import reversion
from django.db import migrations
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def set_measured_volume_properties_optional(apps, schema_editor):
    PROPERTY_TYPE_NAME = "Measured Volume (uL)"
    PROTOCOL_NAMES = ["Sample Quality Control", "Library Quality Control"]

    PropertyType = apps.get_model("fms_core", "PropertyType")
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    protocol_content_type = ContentType.objects.get_for_model(Protocol)

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        
        reversion.set_comment(f"Set '{PROPERTY_TYPE_NAME}' property types as optional.")
        reversion.set_user(admin_user)

        for protocol_name in PROTOCOL_NAMES:
            object_id = Protocol.objects.get(name=protocol_name).id
            property_type = PropertyType.objects.get(name=PROPERTY_TYPE_NAME, object_id=object_id, content_type=protocol_content_type)
            property_type.is_optional = True
            property_type.save()
            reversion.add_to_revision(property_type)
>>>>>>> master


class Migration(migrations.Migration):

<<<<<<< HEAD
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL),('fms_core', '0064_v4_11_0')]
    operations = [migrations.RunPython(add_sample_qc_distinction_dna_rna,reverse_code=migrations.RunPython.noop)]
=======
    dependencies = [
        ('fms_core', '0064_v4_11_0'),
    ]

    operations = [
        migrations.RunPython(
            set_measured_volume_properties_optional,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
>>>>>>> master
