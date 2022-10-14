from django.contrib.auth.models import User
from django.db import migrations, models
import reversion

ADMIN_USERNAME = 'biobankadmin'


def add_units_to_property_names(apps, schema_editor):
    PropertyType = apps.get_model("fms_core", "PropertyType")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Update Property Types to include units for concentration and volume.")
        reversion.set_user(admin_user)

        UPDATED_PROPERTY_TYPE_NAMES = {
            51: ("Measured Volume", "Measured Volume (uL)"),
            52: ("Concentration", "Concentration (ng/uL)"),
            77: ("Measured Volume", "Measured Volume (uL)"),
            78: ("Concentration", "Concentration (ng/uL)"),
            79: ("Library Size", "Library Size (bp)"),
            84: ("Final Volume", "Final Volume (uL)"),
            85: ("Final Concentration", "Final Concentration (ng/uL)"),
        }

        for id, (old_name, new_name) in UPDATED_PROPERTY_TYPE_NAMES.items():
            new_property_type = PropertyType.objects.get(id=id, name=old_name)
            new_property_type.name = new_name
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
    ]