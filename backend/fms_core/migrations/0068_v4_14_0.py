import reversion
import re
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def remove_dot_from_name_and_alias(apps, schema_editor):
    CHARACTER_TO_REPLACE = "."
    REPLACEMENT_CHARACTER = "_"
    Biosample = apps.get_model("fms_core", "Biosample")
    Sample = apps.get_model("fms_core", "Sample")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Replace dots in biosample alias and sample name by underscores.")
        reversion.set_user(admin_user)

        for biosample in Biosample.objects.filter(alias__contains=CHARACTER_TO_REPLACE):
            new_alias = biosample.alias.replace(CHARACTER_TO_REPLACE, REPLACEMENT_CHARACTER)
            biosample.alias = new_alias
            biosample.save()
            reversion.add_to_revision(biosample)

        for sample in Sample.objects.filter(name__contains=CHARACTER_TO_REPLACE):
            new_name = sample.name.replace(CHARACTER_TO_REPLACE, REPLACEMENT_CHARACTER)
            sample.name = new_name
            sample.save()
            reversion.add_to_revision(sample)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0067_v4_13_0'),
    ]

    operations = [
        migrations.RunPython(
            remove_dot_from_name_and_alias,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='biosample',
            name='alias',
            field=models.CharField(help_text='Alternative biosample name given by the collaborator or customer.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9\\-_]{1,200}$'))]),
        ),
        migrations.AlterField(
            model_name='sample',
            name='name',
            field=models.CharField(help_text='Sample name.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9\\-_]{1,200}$'))]),
        ),
    ]
