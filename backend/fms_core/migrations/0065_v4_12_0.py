from django.conf import settings
from django.db import migrations
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

# adding the following steps
# important !! the column name will change because it doesn't exist in SAMPLE_QC_TEMPLATE
# column sample kind to be added to template
def add_sample_qc_distinction_dna_rna(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")
    Protocol = apps.get_model("fms_core", "Protocol")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")

    STEPS = [
        {"name": "Sample QC (DNA)", "protocol_name": "Sample Quality Control","expected_sample_type": "EXTRACTED_SAMPLE", "specifications": [
            {"display_name": "Sample QC Type", "sheet_name": "SampleQC", "column_name": "Sample Kind", "value": "DNA"}]
        },
        {"name": "Sample QC (RNA)", "protocol_name": "Sample Quality Control","expected_sample_type": "EXTRACTED_SAMPLE", "specifications": [
            {"display_name": "Sample QC Type", "sheet_name": "SampleQC", "column_name": "Sample Kind", "value": "RNA"}]
        }
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create the basic initial workflows.")
        reversion.set_user(admin_user)
        #  existing step sample QC to be removed?
        step = Step.objects.get(name="Sample QC").delete()
        for step_info in STEPS:
            protocol = Protocol.objects.get(name=step_info["protocol_name"])
            step = Step.objects.create(name=step_info["name"],
                                       protocol_id=protocol.id,
                                       type="PROTOCOL",
                                       needs_placement=False,
                                       needs_planning=True,
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

class Migration(migrations.Migration):

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL),('fms_core', '0064_v4_11_0')]
    operations = [migrations.RunPython(add_sample_qc_distinction_dna_rna,reverse_code=migrations.RunPython.noop)]