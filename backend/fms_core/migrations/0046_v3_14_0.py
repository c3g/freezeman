# Generated by Django 3.1 on 2022-11-08 16:06
from django.conf import settings
from django.db import migrations, models
import django.core.validators
from django.contrib.auth.models import User
import django.db.models.deletion
from django.contrib.postgres.fields import ArrayField
import re
import reversion

ADMIN_USERNAME = 'biobankadmin'


def populate_instrument_serial_id(apps, schema_editor):
    """
    For each existing instrument, populate the new serial_id field with their value.

    Args:
        apps: apps class handle
        schema_editor: ignore
    """
    Instrument = apps.get_model("fms_core", "Instrument")

    INSTRUMENTS = {
      "iScan_1": "iScan_1",
      "01-Marie Curie": "R2130400190016",
      "02-Frida Kahlo": "R2130400190018",
      "03-Jennifer Doudna": "R1100600200054",
    }

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment(f"Populate existing instruments with their respective serial_id.")
        reversion.set_user(admin_user)

        for seq_instrument in Instrument.objects.all():
            seq_instrument.serial_id = INSTRUMENTS[seq_instrument.name]
            seq_instrument.save()
            reversion.add_to_revision(seq_instrument)
            
            
def create_illumina_related_objects(apps, schema_editor):
    Platform = apps.get_model("fms_core", "Platform")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")
    Instrument = apps.get_model("fms_core", "Instrument")
    RunType = apps.get_model("fms_core", "RunType")
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create objects related to Illumina experiment run")
        reversion.set_user(admin_user)

        # Platform and InstrumentType already created for Illumina
        platform = Platform.objects.get(name="ILLUMINA")

        # Instrument dictionary {NAME: TYPE} for creation
        INSTRUMENTS = {
            "Rosalind Franklin": {
                "type": "Illumina NovaSeq 6000",
                "serial_id": "A00266",
            },
            "Carrie Derick": {
                "type": "Illumina NovaSeq 6000",
                "serial_id": "A01433",
            },
            "Barbara McClintock": {
                "type": "Illumina NovaSeq 6000",
                "serial_id": "A01861",
            },
            "Mykonos": {
                "type": "Illumina MiSeq",
                "serial_id": "M03555",
            },
        }
        for name in INSTRUMENTS.keys():
            it = InstrumentType.objects.get(type=INSTRUMENTS[name]["type"])
            i = Instrument.objects.create(name=name,
                                          type=it,
                                          serial_id=INSTRUMENTS[name]["serial_id"],
                                          created_by_id=admin_user_id,
                                          updated_by_id=admin_user_id)
            reversion.add_to_revision(i)

        # Create PropertyType and Protocols
        PROPERTY_TYPES_BY_PROTOCOL = {
            "Illumina Preparation": [("Flowcell Lot", "str"),
                                   ("Sequencer Side", "str"),
                                   ("PhiX V3 Lot", "str"),
                                   ("NaOH 2N Lot", "str"),
                                   ("Buffer Reagents Lot", "str"),
                                   ("SBS Reagents Lot", "str"),
                                   ("NovaSeq XP Lot", "str"),
                                   ("Read 1 Cycles", "str"),
                                   ("Read 2 Cycles", "str"),
                                   ("Index 1 Cycles", "str"),
                                   ("Index 2 Cycles", "str"),
                                   ],
        }
        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name,
                                               created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            for (property, value_type) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                pt = PropertyType.objects.create(name=property,
                                                 object_id=protocol.id,
                                                 content_type=protocol_content_type,
                                                 value_type=value_type,
                                                 is_optional=False,
                                                 created_by_id=admin_user_id, updated_by_id=admin_user_id)
                reversion.add_to_revision(pt)

        # Create RunType Illumina
        rt = RunType.objects.create(name="Illumina",
                                    platform=platform,
                                    protocol=protocol,
                                    needs_run_processing=True,
                                    created_by_id=admin_user_id,
                                    updated_by_id=admin_user_id)
        reversion.add_to_revision(rt)


def set_needs_processing_flags(apps, schema_editor) :
    # Set the RunType.needs_run_processing flag to True for DBNSEQ and Illumina run types.
    RunType = apps.get_model("fms_core", "RunType")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Set needs_run_processing flags on DBNSEQ and Illumina run types.")
        reversion.set_user(admin_user)

        run_types = RunType.objects.all()

        for run_type in run_types:
            if (run_type.platform.name == "DNBSEQ" or run_type.platform.name == "ILLUMINA"):
                run_type.needs_run_processing = True
            run_type.save()
            reversion.add_to_revision(run_type)


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0045_v3_13_0'),
    ]

    operations = [
        migrations.AddField(
            model_name='runtype',
            name='needs_run_processing',
            field=models.BooleanField(default=False, help_text='Run processing is expected for this run type.'),
        ),
         migrations.AddField(
            model_name='experimentrun',
            name='run_processing_launch_date',
            field=models.DateTimeField(help_text='Date on which run processing was launched, if it has been launched.', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='instrument',
            name='serial_id',
            field=models.CharField(max_length=200, null=True, blank=True, help_text="Internal identifier for the instrument."),
        ),
        migrations.RunPython(
            populate_instrument_serial_id,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='instrument',
            name='serial_id',
            field=models.CharField(max_length=200, unique=True, help_text="Internal identifier for the instrument."),
        ),
        migrations.RunPython(
            create_illumina_related_objects,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('infinium gs 24 beadchip', 'infinium gs 24 beadchip'),
                                            ('dnbseq-g400 flowcell', 'dnbseq-g400 flowcell'),
                                            ('dnbseq-t7 flowcell', 'dnbseq-t7 flowcell'),
                                            ('illumina-novaseq-sp flowcell', 'illumina-novaseq-sp flowcell'),
                                            ('illumina-novaseq-s1 flowcell', 'illumina-novaseq-s1 flowcell'),
                                            ('illumina-novaseq-s2 flowcell', 'illumina-novaseq-s2 flowcell'),
                                            ('illumina-novaseq-s4 flowcell', 'illumina-novaseq-s4 flowcell'),
                                            ('illumina-miseq-v2 flowcell', 'illumina-miseq-v2 flowcell'),
                                            ('illumina-miseq-v3 flowcell', 'illumina-miseq-v3 flowcell'),
                                            ('illumina-miseq-micro flowcell', 'illumina-miseq-micro flowcell'),
                                            ('illumina-miseq-nano flowcell', 'illumina-miseq-nano flowcell'),
                                            ('tube', 'tube'), ('tube strip 2x1', 'tube strip 2x1'),
                                            ('tube strip 3x1', 'tube strip 3x1'), ('tube strip 4x1', 'tube strip 4x1'),
                                            ('tube strip 5x1', 'tube strip 5x1'), ('tube strip 6x1', 'tube strip 6x1'),
                                            ('tube strip 7x1', 'tube strip 7x1'), ('tube strip 8x1', 'tube strip 8x1'),
                                            ('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'),
                                            ('tube box 3x3', 'tube box 3x3'), ('tube box 6x6', 'tube box 6x6'),
                                            ('tube box 7x7', 'tube box 7x7'), ('tube box 8x8', 'tube box 8x8'),
                                            ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'),
                                            ('tube box 21x10', 'tube box 21x10'), ('tube rack 4x6', 'tube rack 4x6'),
                                            ('tube rack 8x12', 'tube rack 8x12'), ('box', 'box'), ('drawer', 'drawer'),
                                            ('freezer rack 2x4', 'freezer rack 2x4'),
                                            ('freezer rack 3x4', 'freezer rack 3x4'),
                                            ('freezer rack 4x4', 'freezer rack 4x4'),
                                            ('freezer rack 4x6', 'freezer rack 4x6'),
                                            ('freezer rack 5x4', 'freezer rack 5x4'),
                                            ('freezer rack 6x4', 'freezer rack 6x4'),
                                            ('freezer rack 7x4', 'freezer rack 7x4'),
                                            ('freezer rack 10x5', 'freezer rack 10x5'),
                                            ('freezer rack 8x6', 'freezer rack 8x6'),
                                            ('freezer rack 11x6', 'freezer rack 11x6'),
                                            ('freezer rack 11x7', 'freezer rack 11x7'),
                                            ('freezer 3 shelves', 'freezer 3 shelves'),
                                            ('freezer 4 shelves', 'freezer 4 shelves'),
                                            ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room')],
                                   help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.',
                                   max_length=30),
        ),
        migrations.AlterField(
            model_name='experimentrun',
            name='container',
            field=models.OneToOneField(help_text='Container', limit_choices_to={'kind__in': (
            'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-sp flowcell',
            'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell',
            'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell',
            'illumina-miseq-nano flowcell')}, on_delete=django.db.models.deletion.PROTECT,
                                       related_name='experiment_run', to='fms_core.container'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='container',
            field=models.ForeignKey(help_text='Container in which the sample is placed.', limit_choices_to={
                'kind__in': (
                'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-sp flowcell',
                'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell',
                'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell',
                'illumina-miseq-nano flowcell', 'tube', 'tube strip 2x1', 'tube strip 3x1', 'tube strip 4x1',
                'tube strip 5x1', 'tube strip 6x1', 'tube strip 7x1', 'tube strip 8x1', '96-well plate',
                '384-well plate')}, on_delete=django.db.models.deletion.PROTECT, related_name='samples',
                                    to='fms_core.container'),
        ),
         migrations.RunPython(
            set_needs_processing_flags,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
