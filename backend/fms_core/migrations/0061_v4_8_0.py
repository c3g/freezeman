import reversion
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def allow_placement_for_more_protocols(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")

    STEPS_WITH_PLACEMENT = [
        "Experiment Run Illumina",
        "Experiment Run DNBSEQ",
        "Experiment Run Infinium",
        "Experiment Run Axiom",
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Set needs_placement to True for steps that can now use the placement tool.")
        reversion.set_user(admin_user)

        for name in STEPS_WITH_PLACEMENT:
            step = Step.objects.get(name=name)
            step.needs_placement = True
            step.save()
            reversion.add_to_revision(step)

def set_illumina_preparation_properties_optional(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    protocol_content_type = ContentType.objects.get_for_model(Protocol)
    object_id = Protocol.objects.get(name="Illumina Preparation").id

    NEW_OPTIONAL_PROPERTY_TYPES = ["PhiX V3 Lot",
                                   "NaOH 2N Lot",
                                   "Buffer Reagents Lot",
                                   "SBS Reagents Lot",
                                   "NovaSeq XP Lot",
                                  ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        
        reversion.set_comment("Set some property types as optional for Illumina Preparation protocol.")
        reversion.set_user(admin_user)

        for name in NEW_OPTIONAL_PROPERTY_TYPES:
            property_type = PropertyType.objects.get(name=name, object_id=object_id, content_type=protocol_content_type)
            property_type.is_optional = True
            property_type.save()
            reversion.add_to_revision(property_type)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0060_v4_7_0'),
    ]

    operations = [
        migrations.AlterField(
            model_name='propertytype',
            name='object_id',
            field=models.BigIntegerField(),
        ),
        migrations.AlterField(
            model_name='propertyvalue',
            name='object_id',
            field=models.BigIntegerField(),
        ),
        migrations.CreateModel(
            name='ArchivedComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('object_id', models.BigIntegerField()),
                ('comment', models.TextField(help_text='Comment to be archived.')),
                ('content_type', models.ForeignKey(limit_choices_to=models.Q(('app_label', 'fms_core'), ('model', 'dataset')), on_delete=django.db.models.deletion.PROTECT, to='contenttypes.contenttype')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='%(app_label)s_%(class)s_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.RunPython(
            allow_placement_for_more_protocols,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            set_illumina_preparation_properties_optional,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
