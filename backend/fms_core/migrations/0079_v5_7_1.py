import reversion

from django.contrib.auth import get_user_model
import django.db.models.deletion
from django.db import migrations, models

from fms_core.models._constants import INDEX_READ_FORWARD

ADMIN_USERNAME = 'biobankadmin'

def create_miseq_i100_instrument(apps, schema_editor):
    Instrument = apps.get_model("fms_core", "Instrument")
    Platform = apps.get_model("fms_core", "Platform")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")

    with reversion.create_revision(manage_manually=True):
        admin_user = get_user_model().objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.pk

        reversion.set_comment(f"Create instrument for MiSeq i100 instrument.")
        platform = Platform.objects.get(name="ILLUMINA")

        instrument_type = InstrumentType.objects.create(
            platform=platform,
            type="Illumina MiSeq i100",
            index_read_5_prime=INDEX_READ_FORWARD,
            index_read_3_prime=INDEX_READ_FORWARD,
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(instrument_type)

        instrument = Instrument.objects.create(
            name="Emmanuelle Charpentier",
            type=instrument_type,
            serial_id="SH01468",
            created_by_id=admin_user_id, updated_by_id=admin_user_id
        )
        reversion.add_to_revision(instrument)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0078_v5_7_0'),
    ]

    operations = [
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('axiom 96-format array pmra', 'axiom 96-format array pmra'), ('axiom 96-format array ukbb', 'axiom 96-format array ukbb'), ('infinium epic 8 beadchip', 'infinium epic 8 beadchip'), ('infinium gs 24 beadchip', 'infinium gs 24 beadchip'), ('dnbseq-g400 flowcell', 'dnbseq-g400 flowcell'), ('dnbseq-t7 flowcell', 'dnbseq-t7 flowcell'), ('illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-1.5b flowcell'), ('illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-10b flowcell'), ('illumina-novaseq-x-25b flowcell', 'illumina-novaseq-x-25b flowcell'), ('illumina-novaseq-sp flowcell', 'illumina-novaseq-sp flowcell'), ('illumina-novaseq-s1 flowcell', 'illumina-novaseq-s1 flowcell'), ('illumina-novaseq-s2 flowcell', 'illumina-novaseq-s2 flowcell'), ('illumina-novaseq-s4 flowcell', 'illumina-novaseq-s4 flowcell'), ('illumina-miseq-v2 flowcell', 'illumina-miseq-v2 flowcell'), ('illumina-miseq-v3 flowcell', 'illumina-miseq-v3 flowcell'), ('illumina-miseq-micro flowcell', 'illumina-miseq-micro flowcell'), ('illumina-miseq-nano flowcell', 'illumina-miseq-nano flowcell'), ('illumina-miseq-i100-5m flowcell', 'illumina-miseq-i100-5m flowcell'), ('illumina-miseq-i100-25m flowcell', 'illumina-miseq-i100-25m flowcell'), ('illumina-miseq-i100-50m flowcell', 'illumina-miseq-i100-50m flowcell'), ('illumina-miseq-i100-100m flowcell', 'illumina-miseq-i100-100m flowcell'), ('illumina-iseq-100 flowcell', 'illumina-iseq-100 flowcell'), ('pacbio-revio smrt cell tray', 'pacbio-revio smrt cell tray'), ('ultima wafer', 'ultima wafer'), ('tube', 'tube'), ('tube strip 2x1', 'tube strip 2x1'), ('tube strip 3x1', 'tube strip 3x1'), ('tube strip 4x1', 'tube strip 4x1'), ('tube strip 5x1', 'tube strip 5x1'), ('tube strip 6x1', 'tube strip 6x1'), ('tube strip 7x1', 'tube strip 7x1'), ('tube strip 8x1', 'tube strip 8x1'), ('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'), ('tube box 3x3', 'tube box 3x3'), ('tube box 6x6', 'tube box 6x6'), ('tube box 7x7', 'tube box 7x7'), ('tube box 8x8', 'tube box 8x8'), ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'), ('tube box 21x10', 'tube box 21x10'), ('tube rack 4x6', 'tube rack 4x6'), ('tube rack 8x12', 'tube rack 8x12'), ('box', 'box'), ('drawer', 'drawer'), ('freezer rack 2x4', 'freezer rack 2x4'), ('freezer rack 3x4', 'freezer rack 3x4'), ('freezer rack 4x4', 'freezer rack 4x4'), ('freezer rack 4x6', 'freezer rack 4x6'), ('freezer rack 5x4', 'freezer rack 5x4'), ('freezer rack 6x4', 'freezer rack 6x4'), ('freezer rack 7x4', 'freezer rack 7x4'), ('freezer rack 10x5', 'freezer rack 10x5'), ('freezer rack 8x6', 'freezer rack 8x6'), ('freezer rack 11x6', 'freezer rack 11x6'), ('freezer rack 16x6', 'freezer rack 16x6'), ('freezer rack 11x7', 'freezer rack 11x7'), ('freezer 3 shelves', 'freezer 3 shelves'), ('freezer 4 shelves', 'freezer 4 shelves'), ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room'), ('site', 'site')], help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.', max_length=40),
        ),
        migrations.AlterField(
            model_name='experimentrun',
            name='container',
            field=models.OneToOneField(help_text='Container', limit_choices_to={'kind__in': ('axiom 96-format array pmra', 'axiom 96-format array ukbb', 'infinium epic 8 beadchip', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-25b flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-miseq-i100-5m flowcell', 'illumina-miseq-i100-25m flowcell', 'illumina-miseq-i100-50m flowcell', 'illumina-miseq-i100-100m flowcell', 'illumina-iseq-100 flowcell', 'pacbio-revio smrt cell tray', 'ultima wafer')}, on_delete=django.db.models.deletion.PROTECT, related_name='experiment_run', to='fms_core.container'),
        ),
        migrations.AlterField(
            model_name='sample',
            name='container',
            field=models.ForeignKey(help_text='Container in which the sample is placed.', limit_choices_to={'kind__in': ('axiom 96-format array pmra', 'axiom 96-format array ukbb', 'infinium epic 8 beadchip', 'infinium gs 24 beadchip', 'dnbseq-g400 flowcell', 'dnbseq-t7 flowcell', 'illumina-novaseq-x-1.5b flowcell', 'illumina-novaseq-x-10b flowcell', 'illumina-novaseq-x-25b flowcell', 'illumina-novaseq-sp flowcell', 'illumina-novaseq-s1 flowcell', 'illumina-novaseq-s2 flowcell', 'illumina-novaseq-s4 flowcell', 'illumina-miseq-v2 flowcell', 'illumina-miseq-v3 flowcell', 'illumina-miseq-micro flowcell', 'illumina-miseq-nano flowcell', 'illumina-miseq-i100-5m flowcell', 'illumina-miseq-i100-25m flowcell', 'illumina-miseq-i100-50m flowcell', 'illumina-miseq-i100-100m flowcell', 'illumina-iseq-100 flowcell', 'pacbio-revio smrt cell tray', 'ultima wafer', 'tube', 'tube strip 2x1', 'tube strip 3x1', 'tube strip 4x1', 'tube strip 5x1', 'tube strip 6x1', 'tube strip 7x1', 'tube strip 8x1', '96-well plate', '384-well plate')}, on_delete=django.db.models.deletion.PROTECT, related_name='samples', to='fms_core.container'),
        ),
        migrations.RunPython(create_miseq_i100_instrument, reverse_code=migrations.RunPython.noop),
    ]
