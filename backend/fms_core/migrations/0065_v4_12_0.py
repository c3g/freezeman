import reversion
from django.db import migrations
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def add_sample_qc_distinction_dna_rna(apps, schema_editor):
    # load the new sample qc steps and other necessary assets
    STEPS = [
        {"name": "Sample QC (DNA)", "protocol_name": "Sample Quality Control","expected_sample_type": "EXTRACTED_SAMPLE",
          "specifications": [{"display_name": "SampleQcType", "sheet_name": "SampleQC", "column_name": "Sample Kind", "value": "DNA"}]
        },
        {"name": "Sample QC (RNA)", "protocol_name": "Sample Quality Control","expected_sample_type": "EXTRACTED_SAMPLE",
         "specifications": [{"display_name": "SampleQcType", "sheet_name": "SampleQC", "column_name": "Sample Kind", "value": "RNA"}]
        }
    ]
    StepOrder = apps.get_model("fms_core", "StepOrder")
    SampleNextStep = apps.get_model("fms_core", "SampleNextStep")
    Step = apps.get_model("fms_core", "Step")
    Protocol = apps.get_model("fms_core", "Protocol")
    StepSpecification = apps.get_model("fms_core", "StepSpecification")
    # create the new steps and its necessary objects
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
        dnaStep = Step.objects.get(name="Sample QC (DNA)")
        rnaStep = Step.objects.get(name="Sample QC (RNA)")
        # Start for data transfer process
        sns = SampleNextStep.objects.filter(step__id=oldStep.id)
        for sampleNextStep in sns:
            updatedSampleNextStep = SampleNextStep.objects.get(id=sampleNextStep.id)
            if sampleNextStep.sample.derived_samples.first().sample_kind.name == "DNA":
              updatedSampleNextStep.step = dnaStep
            elif sampleNextStep.sample.derived_samples.first().sample_kind.name == "RNA":
              updatedSampleNextStep.step = rnaStep
            updatedSampleNextStep.save()
            reversion.add_to_revision(updatedSampleNextStep)
        # make sure there are no loose ends before deleting oldStep
        so = StepOrder.objects.filter(step__id=oldStep.id)
        for order in so:
            if "Extraction (DNA)" in order.previous_step_order.first().step.name:
                order.step = dnaStep
            elif "Extraction (RNA)" in order.previous_step_order.first().step.name:
                order.step = rnaStep
            order.save()
            reversion.add_to_revision(order)
        reversion.add_to_revision(oldStep)
        oldStep.delete()

def remove_serial_number_from_some_instruments(apps, schema_editor):
    instrument_name_maps = {
        "Rosalind Franklin": "Decomissioned-Rosalind Franklin",
        "LH00375-Rosalind Franklin": "Rosalind Franklin",
    }
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment("Decomissioned Rosalind Franklin and renamed LH00375-Rosalind Franklin to Rosalind Franklin.")
        reversion.set_user(admin_user)

        Instrument = apps.get_model("fms_core", "Instrument")
        for old, new in instrument_name_maps.items():
            instrument = Instrument.objects.get(name=old)
            instrument.name = new
            instrument.save()
            reversion.add_to_revision(instrument)

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

def remove_serial_number_from_some_instruments(apps, schema_editor):
    instrument_name_maps = {
        "Rosalind Franklin": "Decomissioned-Rosalind Franklin",
        "LH00375-Rosalind Franklin": "Rosalind Franklin",
    }
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment("Decomissioned Rosalind Franklin and renamed LH00375-Rosalind Franklin to Rosalind Franklin.")
        reversion.set_user(admin_user)

        Instrument = apps.get_model("fms_core", "Instrument")
        for old, new in instrument_name_maps.items():
            instrument = Instrument.objects.get(name=old)
            instrument.name = new
            instrument.save()
            reversion.add_to_revision(instrument)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0064_v4_11_0'),
    ]

    operations = [
        migrations.RunPython(
            set_measured_volume_properties_optional,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            add_sample_qc_distinction_dna_rna,
            reverse_code=migrations.RunPython.noop
        ),
        migrations.RemoveField(
            model_name='samplekind',
            name='concentration_required',
        ),
        migrations.RunPython(
            remove_serial_number_from_some_instruments,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
