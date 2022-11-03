from django.contrib.auth.models import User
from django.db import migrations, models
import reversion

ADMIN_USERNAME = 'biobankadmin'


def add_units_to_property_names(apps, schema_editor):
    PropertyType = apps.get_model("fms_core", "PropertyType")
    Protocol = apps.get_model("fms_core", "Protocol")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Update Property Types to include units for concentration and volume.")
        reversion.set_user(admin_user)

        UPDATED_PROPERTY_TYPE_NAMES = {
            51: ("Measured Volume", "Measured Volume (uL)", "Sample Quality Control"),
            52: ("Concentration", "Concentration (ng/uL)", "Sample Quality Control"),
            77: ("Measured Volume", "Measured Volume (uL)", "Library Quality Control"),
            78: ("Concentration", "Concentration (ng/uL)", "Library Quality Control"),
            79: ("Library Size", "Library Size (bp)", "Library Quality Control"),
            84: ("Final Volume", "Final Volume (uL)", "Normalization"),
            85: ("Final Concentration", "Final Concentration (ng/uL)", "Normalization"),
        }

        for id, (old_name, new_name, protocol_name) in UPDATED_PROPERTY_TYPE_NAMES.items():
            protocol = Protocol.objects.get(name=protocol_name)
            new_property_type = PropertyType.objects.get(object_id=protocol.id, name=old_name)
            new_property_type.name = new_name
            new_property_type.save()
            reversion.add_to_revision(new_property_type)

def make_library_size_property_optional(apps, schema_editor):
    PropertyType = apps.get_model("fms_core", "PropertyType")
    Protocol = apps.get_model("fms_core", "Protocol")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Update Property Type 'Library Size (bp)' to be optional in order to allow pool QC.")
        reversion.set_user(admin_user)

        protocol_lib_qc = Protocol.objects.get(name="Library Quality Control")
        new_property_type = PropertyType.objects.get(object_id=protocol_lib_qc.id, name="Library Size (bp)")
        new_property_type.is_optional = True
        new_property_type.save()
        reversion.add_to_revision(new_property_type)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0043_v3_12_0'),
    ]

    operations = [
        migrations.RunPython(
            add_units_to_property_names,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name='derivedbysample',
            constraint=models.UniqueConstraint(fields=('derived_sample_id', 'sample_id'), name='derivedbysample_derivedsampleid_sampleid_key'),
        ),
        migrations.RunPython(
            make_library_size_property_optional,
            reverse_code=migrations.RunPython.noop,
        ),
    ]