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
            "Rosalind Franklin": "Illumina NovaSeq 6000",
            "Carrie Derick": "Illumina NovaSeq 6000",
            "Barbara McClintock": "Illumina NovaSeq 6000",
            "Mykonos": "Illumina MiSeq",
        }
        for name in INSTRUMENTS.keys():
            it = InstrumentType.objects.get(type=INSTRUMENTS[name])
            i = Instrument.objects.create(name=name,
                                          type=it,
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
                                    created_by_id=admin_user_id,
                                    updated_by_id=admin_user_id)
        reversion.add_to_revision(rt)


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0045_v3_13_0'),
    ]

    operations = [
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
    ]
