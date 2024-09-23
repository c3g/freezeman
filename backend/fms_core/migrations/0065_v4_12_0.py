import reversion
from django.db import migrations
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

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
        migrations.RemoveField(
            model_name='samplekind',
            name='concentration_required',
        ),
        migrations.RunPython(
            remove_serial_number_from_some_instruments,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            add_sample_qc_distinction_dna_rna,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
