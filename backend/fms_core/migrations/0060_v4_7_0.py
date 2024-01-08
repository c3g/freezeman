import reversion
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

from fms_core.models._constants import INDEX_READ_FORWARD, INDEX_READ_REVERSE

ADMIN_USERNAME = 'biobankadmin'

def create_novaseq_x_instrument_type(apps, schema_editor):
    Platform = apps.get_model("fms_core", "Platform")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create NovaSeq X instrument type.")
        reversion.set_user(admin_user)

        # Platform and InstrumentType already created for Illumina
        platform = Platform.objects.get(name="ILLUMINA")

        # Instrument dictionary {NAME: TYPE} for creation
        INSTRUMENT_TYPE =  "Illumina NovaSeq X"

        i = InstrumentType.objects.create(type=INSTRUMENT_TYPE,
                                          platform=platform,
                                          index_read_3_prime=INDEX_READ_FORWARD,
                                          index_read_5_prime=INDEX_READ_REVERSE,
                                          created_by_id=admin_user_id,
                                          updated_by_id=admin_user_id)

        reversion.add_to_revision(i)

def create_novaseq_x_instrument(apps, schema_editor):
    InstrumentType = apps.get_model("fms_core", "InstrumentType")
    Instrument = apps.get_model("fms_core", "Instrument")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create NovaSeq X instrument.")
        reversion.set_user(admin_user)

        # Instrument dictionary {NAME: TYPE} for creation
        INSTRUMENT = {
            "LH00375-Rosalind Franklin": {
                "type": "Illumina NovaSeq X",
                "serial_id": "LH00375",
            },
        }
        for name in INSTRUMENT.keys():
            it = InstrumentType.objects.get(type=INSTRUMENT[name]["type"])
            i = Instrument.objects.create(name=name,
                                          type=it,
                                          serial_id=INSTRUMENT[name]["serial_id"],
                                          created_by_id=admin_user_id,
                                          updated_by_id=admin_user_id)
            reversion.add_to_revision(i)

def set_steps_without_placement(apps, schema_editor):
    Step = apps.get_model("fms_core", "Step")

    STEPS_WITHOUT_PLACEMENT = ["Sample QC",
                               "Library QC",
                               "Axiom Sample Preparation",
                               "Axiom Create Folders",
                               "Quality Control - Integration (Spark)"]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        
        reversion.set_comment("Set needs_placement to false for steps that do not require placement.")
        reversion.set_user(admin_user)

        for name in STEPS_WITHOUT_PLACEMENT:
            step = Step.objects.get(name=name)
            step.needs_placement = False
            step.save()
            reversion.add_to_revision(step)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0059_v4_6_2'),
    ]

    operations = [
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('axiom 96-format array pmra', 'axiom 96-format array pmra'), ('axiom 96-format array ukbb', 'axiom 96-format array ukbb'), ('infinium gs 24 beadchip', 'infinium gs 24 beadchip'), ('dnbseq-g400 flowcell', 'dnbseq-g400 flowcell'), ('dnbseq-t7 flowcell', 'dnbseq-t7 flowcell'), ('illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-1.5b flowcell'), ('illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-10b flowcell'), ('illumina-novaseq-x-25b flowcell', 'illumina-novaseq-x-25b flowcell'), ('illumina-novaseq-sp flowcell', 'illumina-novaseq-sp flowcell'), ('illumina-novaseq-s1 flowcell', 'illumina-novaseq-s1 flowcell'), ('illumina-novaseq-s2 flowcell', 'illumina-novaseq-s2 flowcell'), ('illumina-novaseq-s4 flowcell', 'illumina-novaseq-s4 flowcell'), ('illumina-miseq-v2 flowcell', 'illumina-miseq-v2 flowcell'), ('illumina-miseq-v3 flowcell', 'illumina-miseq-v3 flowcell'), ('illumina-miseq-micro flowcell', 'illumina-miseq-micro flowcell'), ('illumina-miseq-nano flowcell', 'illumina-miseq-nano flowcell'), ('illumina-iseq-100 flowcell', 'illumina-iseq-100 flowcell'), ('tube', 'tube'), ('tube strip 2x1', 'tube strip 2x1'), ('tube strip 3x1', 'tube strip 3x1'), ('tube strip 4x1', 'tube strip 4x1'), ('tube strip 5x1', 'tube strip 5x1'), ('tube strip 6x1', 'tube strip 6x1'), ('tube strip 7x1', 'tube strip 7x1'), ('tube strip 8x1', 'tube strip 8x1'), ('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'), ('tube box 3x3', 'tube box 3x3'), ('tube box 6x6', 'tube box 6x6'), ('tube box 7x7', 'tube box 7x7'), ('tube box 8x8', 'tube box 8x8'), ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'), ('tube box 21x10', 'tube box 21x10'), ('tube rack 4x6', 'tube rack 4x6'), ('tube rack 8x12', 'tube rack 8x12'), ('box', 'box'), ('drawer', 'drawer'), ('freezer rack 2x4', 'freezer rack 2x4'), ('freezer rack 3x4', 'freezer rack 3x4'), ('freezer rack 4x4', 'freezer rack 4x4'), ('freezer rack 4x6', 'freezer rack 4x6'), ('freezer rack 5x4', 'freezer rack 5x4'), ('freezer rack 6x4', 'freezer rack 6x4'), ('freezer rack 7x4', 'freezer rack 7x4'), ('freezer rack 10x5', 'freezer rack 10x5'), ('freezer rack 8x6', 'freezer rack 8x6'), ('freezer rack 11x6', 'freezer rack 11x6'), ('freezer rack 16x6', 'freezer rack 16x6'), ('freezer rack 11x7', 'freezer rack 11x7'), ('freezer 3 shelves', 'freezer 3 shelves'), ('freezer 4 shelves', 'freezer 4 shelves'), ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room')], help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.', max_length=40),
        ),
        migrations.AlterField(
            model_name='experimentrun',
            name='container',
            field=models.OneToOneField(help_text='Container', limit_choices_to={'kind__in': ('axiom 96-format array pmra', 'axiom 96-format array ukbb', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-25b flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-iseq-100 flowcell')}, on_delete=django.db.models.deletion.PROTECT, related_name='experiment_run', to='fms_core.container'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='container',
            field=models.ForeignKey(help_text='Container in which the sample is placed.', limit_choices_to={'kind__in': ('axiom 96-format array pmra', 'axiom 96-format array ukbb', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-25b flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-iseq-100 flowcell', 'tube', 'tube strip 2x1', 'tube strip 3x1', 'tube strip 4x1', 'tube strip 5x1', 'tube strip 6x1', 'tube strip 7x1', 'tube strip 8x1', '96-well plate', '384-well plate')}, on_delete=django.db.models.deletion.PROTECT, related_name='samples', to='fms_core.container'),
        ),
        migrations.RunPython(
            create_novaseq_x_instrument_type,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            create_novaseq_x_instrument,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AddField(
            model_name='step',
            name='needs_placement',
            field=models.BooleanField(default=True, help_text='Samples on this step need a destination container and coordinates assigned.'),
        ),
        migrations.RunPython(
            set_steps_without_placement,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
