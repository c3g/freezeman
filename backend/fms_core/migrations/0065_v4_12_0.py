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
        {"name": "Sample QC (DNA)", "protocol_name": "Sample QC", "specifications": [
            {"display_name": "Sample QC Type", "sheet_name": "SampleQC", "column_name": "Sample Kind", "value": "DNA"}]
        },
        {"name": "Sample QC (RNA)", "protocol_name": "Sample QC", "specifications": [
            {"display_name": "Sample QC Type", "sheet_name": "SampleQC", "column_name": "Sample Kind", "value": "RNA"}]
        }
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id
        reversion.set_comment(f"Create the basic initial workflows.")
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

    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL),('fms_core', '0064_v4_11_0')]
    operations = [migrations.RunPython(add_sample_qc_distinction_dna_rna,reverse_code=migrations.RunPython.noop)]