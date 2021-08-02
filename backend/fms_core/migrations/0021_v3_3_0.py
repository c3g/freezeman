# Generated by Django 3.1 on 2021-05-17 21:39

from django.conf import settings

import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import reversion
import re
import json
import fms_core.schema_validators


ADMIN_USERNAME='biobankadmin'

'''
    - Models created in this migration:
        ExperimentRun, ExperimentType, Instrument, InstrumentType, Platform, PropertyType, PropertyValue
     
    - Creation of InstrumentTypes by Platform
    
    - For Illumina Infinium: 
        - Creation of instrument "iScan_1" of type "iScan System"
        - Creation of Infinium Global Screening Array-24 experiment type
        - Creation of Illumina Infinium (...) related Protocols
        - Creation of Illumina Infinium property types by Infinium protocol
'''


def rename_process_sample_versions(apps, schema_editor):
    '''
        In Versions, even though the content_type__model is changed from ProcessSample to ProcessMeasurement,
        there remains traces of ProcessSample in the serialized_data model field, and in the obj repr text.
    '''
    Version = apps.get_model("reversion", "Version")

    # Filtering using serialized_data__contains, because content_type model is now ProcessMeasurement due to model rename
    for version in Version.objects.filter(serialized_data__contains='"model": "fms_core.processsample"'):
        version.object_repr = version.object_repr.replace("ProcessSample", "ProcessMeasurement")

        data = json.loads(version.serialized_data)
        data[0]["model"] = "fms_core.processmeasurement"
        version.serialized_data = json.dumps(data)

        version.save()


def create_platforms_and_instrument_types(apps, schema_editor):
    Platform = apps.get_model("fms_core", "Platform")
    InstrumentType = apps.get_model("fms_core", "InstrumentType")

    INSTRUMENT_TYPES_BY_PLATFORM = {
        "LS454": ["454 GS",
                  "454 GS 20",
                  "454 GS FLX",
                  "454 GS FLX+",
                  "454 GS FLX Titanium",
                  "454 GS Junior",],

        "ILLUMINA": ["HiSeq X Five",
                     "HiSeq X Ten",
                     "Illumina Genome Analyzer",
                     "Illumina Genome Analyzer II",
                     "Illumina Genome Analyzer IIx",
                     "Illumina HiScanSQ",
                     "Illumina HiSeq 1000",
                     "Illumina HiSeq 1500",
                     "Illumina HiSeq 2000",
                     "Illumina HiSeq 2500",
                     "Illumina HiSeq 3000",
                     "Illumina HiSeq 4000",
                     "Illumina iSeq 100",
                     "Illumina MiSeq",
                     "Illumina MiniSeq",
                     "Illumina NovaSeq 6000",
                     "NextSeq 500",
                     "NextSeq 550",],

        "ILLUMINA_ARRAY": ["iScan System",],

        "PACBIO_SMRT": ["PacBio RS",
                        "PacBio RS II",
                        "Sequel",],

        "ION_TORRENT": ["Ion Torrent PGM",
                        "Ion Torrent Proton",
                        "Ion Torrent S5",
                        "Ion Torrent S5 XL",],

        "CAPILLARY": ["AB 3730xL Genetic Analyzer",
                      "AB 3730 Genetic Analyzer",
                      "AB 3500xL Genetic Analyzer",
                      "AB 3500 Genetic Analyzer",
                      "AB 3130xL Genetic Analyzer",
                      "AB 3130 Genetic Analyzer",
                      "AB 310 Genetic Analyzer",],

        "OXFORD_NANOPORE": ["MinION",
                            "GridION",
                            "PromethION",],

        "BGISEQ": ["BGISEQ-500",],

        "DNBSEQ": ["DNBSEQ-T7",
                   "DNBSEQ-G400",
                   "DNBSEQ-G50",
                   "DNBSEQ-G400 FAST",],
    }

    admin_user = User.objects.get(username=ADMIN_USERNAME)
    admin_user_id = admin_user.id

    with reversion.create_revision(manage_manually=True):
        reversion.set_comment("Fill with initial platforms and instrument types")
        reversion.set_user(admin_user)

        for name in INSTRUMENT_TYPES_BY_PLATFORM.keys():
            p = Platform(name=name, created_by_id=admin_user_id, updated_by_id=admin_user_id)
            p.save()
            reversion.add_to_revision(p)

            for instrument_type in INSTRUMENT_TYPES_BY_PLATFORM[name]:
                it = InstrumentType(type=instrument_type,
                                    platform=p,
                                    created_by_id=admin_user_id,
                                    updated_by_id=admin_user_id)
                it.save()
                reversion.add_to_revision(it)


def create_instruments(apps, schema_editor):
    InstrumentType = apps.get_model("fms_core", "InstrumentType")
    Instrument = apps.get_model("fms_core", "Instrument")
    
    # Instrument dictionary {NAME: TYPE} for creation
    INSTRUMENTS = {
        "iScan_1": "iScan System",
    }

    admin_user = User.objects.get(username=ADMIN_USERNAME)
    admin_user_id = admin_user.id

    with reversion.create_revision(manage_manually=True):
        reversion.set_comment("Populate instruments")
        reversion.set_user(admin_user)

        for name in INSTRUMENTS.keys():
            it = InstrumentType.objects.get(type=INSTRUMENTS[name])
            i = Instrument.objects.create(name=name,
                                          type=it,
                                          created_by_id=admin_user_id,
                                          updated_by_id=admin_user_id)
            reversion.add_to_revision(i)


def create_infinium_experiment_type(apps, schema_editor):
    ExperimentType = apps.get_model("fms_core", "ExperimentType")
    admin_user = User.objects.get(username=ADMIN_USERNAME)
    admin_user_id = admin_user.id

    with reversion.create_revision(manage_manually=True):
        reversion.set_comment("Creates Experiment Type Infinium")
        reversion.set_user(admin_user)
        et = ExperimentType.objects.create(workflow="Infinium Global Screening Array-24",
                                           created_by_id=admin_user_id,
                                           updated_by_id=admin_user_id)
        reversion.add_to_revision(et)



def create_infinium_property_types_and_protocols(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")

    PROPERTY_TYPES_BY_PROTOCOL = {
        "Illumina Infinium Preparation": [],
        "Infinium: Amplification": [("MSA3 Plate Barcode", "str"),
                                    ("0.1N NaOH formulation date", "str"),
                                    ("Reagent MA1 Barcode", "str"),
                                    ("Reagent MA2 Barcode", "str"),
                                    ("Reagent MSM Barcode", "str"),
                                    ("Incubation time In Amplification", "str"),
                                    ("Incubation time Out Amplification", "str"),
                                    ("Comment Amplification", "str"),
                                    ],
        "Infinium: Fragmentation": [("Reagent FMS Barcode",  "str"),
                                    ("Comment Fragmentation", "str"),
                                    ],
        "Infinium: Precipitation": [("Reagent PM1 Barcode", "str"),
                                    ("Reagent RA1 Barcode Precipitation", "str"),
                                    ("Comment Precipitation", "str"),
                                    ],
        "Infinium: Hybridization": [("Hybridization Chip Barcodes", "str"),
                                    ("Hybridization Chamber Barcode", "str"),
                                    ("Reagent PB2 Barcode", "str"),
                                    ("Reagent XC4 Barcode Hybridization", "str"),
                                    ("Incubation time In Hybridization", "str"),
                                    ("Incubation time Out Hybridization", "str"),
                                    ("Comment Hybridization", "str"),
                                    ],
        "Infinium: Wash Beadchip": [("Reagent PB1 Barcode Wash", "str"),
                                    ("Comment Wash", "str"),
                                    ],
        "Infinium: Extend and Stain": [("95% form/EDTA", "str"),
                                       ("Reagent ATM Barcode", "str"),
                                       ("Reagent EML Barcode", "str"),
                                       ("Reagent LX1 Barcode", "str"),
                                       ("Reagent LX2 Barcode", "str"),
                                       ("Reagent PB1 Barcode Stain", "str"),
                                       ("Reagent RA1 Barcode Stain", "str"),
                                       ("Reagent SML Barcode", "str"),
                                       ("Reagent XC3 Barcode", "str"),
                                       ("Reagent XC4 Barcode Stain", "str"),
                                       ("Comment Stain", "str"),
                                       ],
        "Infinium: Scan Preparation": [("SentrixBarcode_A", "str"),
                                       ("Scan Chip Rack Barcode", "str"),
                                       ("Comment Scan", "str"),
                                       ],
    }

    admin_user = User.objects.get(username=ADMIN_USERNAME)
    admin_user_id = admin_user.id

    ContentType = apps.get_model('contenttypes', 'ContentType')
    protocol_content_type = ContentType.objects.get_for_model(Protocol)

    with reversion.create_revision(manage_manually=True):
        reversion.set_comment("Creates protocols for Infinium Experiment")
        reversion.set_user(admin_user)

        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name,
                                               created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            for (property, value_type) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                is_optional = True if 'comment' in property.lower() else False

                pt = PropertyType.objects.create(name=property,
                                                 object_id=protocol.id,
                                                 content_type=protocol_content_type,
                                                 value_type=value_type,
                                                 is_optional=is_optional,
                                                 created_by_id=admin_user_id, updated_by_id=admin_user_id)
                reversion.add_to_revision(pt)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0020_v3_2_0'),
    ]

    operations = [
        # Renaming ProcessSample model to ProcessMeasurement
        migrations.RenameModel('ProcessSample', 'ProcessMeasurement'),
        migrations.RenameField('SampleLineage', 'process_sample', 'process_measurement'),
        migrations.RunPython(
            rename_process_sample_versions,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='processmeasurement',
            name='created_by',
            field=models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_processmeasurement_creation', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='processmeasurement',
            name='process',
            field=models.ForeignKey(help_text='Process', on_delete=django.db.models.deletion.PROTECT, related_name='process_measurement', to='fms_core.process'),
        ),
        migrations.AlterField(
            model_name='processmeasurement',
            name='source_sample',
            field=models.ForeignKey(help_text='Source Sample', on_delete=django.db.models.deletion.PROTECT, related_name='process_measurement', to='fms_core.sample'),
        ),
        migrations.AlterField(
            model_name='processmeasurement',
            name='updated_by',
            field=models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_processmeasurement_modification', to=settings.AUTH_USER_MODEL),
        ),

        # New models Platform, InstrumentType, Instrument
        migrations.CreateModel(
            name='Platform',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(
                    help_text='This technology used to measure the library. Acceptable values are listed at the ENA: https:\\/\\/ena-docs.readthedocs.io/en/latest/submit/reads/webin-cli.html?highlight=library_strategy#platform',
                    max_length=200, unique=True)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_platform_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_platform_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='InstrumentType',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('type', models.CharField(
                    unique=True,
                    help_text='The product make. Acceptable values are listed at the ENA: https:\\/\\/ena-docs.readthedocs.io/en/latest/submit/reads/webin-cli.html?highlight=library_strategy#permitted-values-for-instrument',
                    max_length=200)),
                ('platform', models.ForeignKey(help_text='Platform', on_delete=django.db.models.deletion.PROTECT,
                                               related_name='instrument_types', to='fms_core.platform')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_instrumenttype_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_instrumenttype_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Instrument',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name',
                 models.CharField(help_text='Unique name for the instrument instance.', max_length=200, unique=True,
                                  validators=[
                                      django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_instrument_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('type', models.ForeignKey(help_text='Instrument type', on_delete=django.db.models.deletion.PROTECT,
                                           related_name='instruments', to='fms_core.instrumenttype')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_instrument_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.RunPython(
            create_platforms_and_instrument_types,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            create_instruments,
            reverse_code=migrations.RunPython.noop,
        ),

        # ExperimentRun and ExperimentType models
        migrations.CreateModel(
            name='ExperimentType',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('workflow',
                 models.CharField(help_text='Placeholder for a future workflow model implementation.', max_length=200,
                                  unique=True, validators=[
                         django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_experimenttype_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_experimenttype_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='ExperimentRun',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('container', models.OneToOneField(help_text='Container', on_delete=django.db.models.deletion.PROTECT,
                                                to='fms_core.container', related_name="experiment_run")),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_experimentrun_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('experiment_type',
                 models.ForeignKey(help_text='Experiment type', on_delete=django.db.models.deletion.PROTECT,
                                   related_name='experiment_runs', to='fms_core.experimenttype')),
                ('instrument', models.ForeignKey(help_text='Instrument', on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='experiment_runs', to='fms_core.instrument')),
                ('start_date', models.DateField(help_text='Date the run was started.')),
                ('process',
                 models.ForeignKey(help_text='Main process associated to this experiment', on_delete=django.db.models.deletion.PROTECT,
                                   related_name='experiment_runs', to='fms_core.process')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_experimentrun_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),


        migrations.RunPython(
            create_infinium_experiment_type,
            reverse_code=migrations.RunPython.noop,
        ),


        # Parent process, creation of Infinium protocol and sub-protocols

        migrations.AddField(
            model_name='process',
            name='parent_process',
            field=models.ForeignKey(blank=True, help_text='Process in which this sub-process is contained', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='child_process', to='fms_core.process'),
        ),


        # Create new container kind for infinium and increase the max length of the container kind field.
        migrations.AlterField(
            model_name='container',
            name='kind',
            field=models.CharField(choices=[('infinium gs 24 beadchip', 'infinium gs 24 beadchip'), ('96-well plate', '96-well plate'), ('384-well plate', '384-well plate'), ('tube', 'tube'), ('tube box 6x6', 'tube box 6x6'), ('tube box 8x8', 'tube box 8x8'), ('tube box 9x9', 'tube box 9x9'), ('tube box 10x10', 'tube box 10x10'), ('tube rack 8x12', 'tube rack 8x12'), ('drawer', 'drawer'), ('freezer rack 4x4', 'freezer rack 4x4'), ('freezer rack 7x4', 'freezer rack 7x4'), ('freezer rack 8x6', 'freezer rack 8x6'), ('freezer rack 11x6', 'freezer rack 11x6'), ('freezer 3 shelves', 'freezer 3 shelves'), ('freezer 5 shelves', 'freezer 5 shelves'), ('room', 'room'), ('box', 'box')], help_text='What kind of container this is. Dictates the coordinate system and other container-specific properties.', max_length=25),
        ),

        # PropertyType and PropertyValue
        migrations.CreateModel(
            name='PropertyType',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='The name of the property', max_length=200, unique=True,
                                          validators=[django.core.validators.RegexValidator(
                                              re.compile('^[a-zA-Z0-9.\\-_ ]{1,200}$'))])),
                ('value_type',
                 models.CharField(choices=[('int', 'int'), ('float', 'float'), ('bool', 'bool'), ('str', 'str')],
                                  help_text='Enumerated type to define value type', max_length=20)),
                ('is_optional', models.BooleanField(default=False, help_text='Whether this property is optional or not')),
                ('object_id', models.PositiveIntegerField()),
                ('content_type',
                 models.ForeignKey(limit_choices_to=models.Q(('app_label', 'fms_core'), ('model', 'protocol')),
                                   on_delete=django.db.models.deletion.PROTECT, to='contenttypes.contenttype')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_propertytype_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_propertytype_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),

        migrations.CreateModel(
            name='PropertyValue',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('value', models.JSONField(help_text='Property value', blank=True, validators=[
                    fms_core.schema_validators.JsonSchemaValidator(
                        {'$id': 'fms:property_value', '$schema': 'http://json-schema.org/draft-07/schema#',
                         'description': 'Schema used to define the value in PropertyValue.',
                         'title': 'PropertyValue value schema', 'type': ['number', 'string', 'boolean']},
                        formats=['date-time'])], verbose_name='Property value')),
                ('object_id', models.PositiveIntegerField()),
                ('content_type', models.ForeignKey(
                    limit_choices_to=models.Q(models.Q(('app_label', 'fms_core'), ('model', 'process')),
                                              models.Q(('app_label', 'fms_core'), ('model', 'processmeasurement')),
                                              _connector='OR'), on_delete=django.db.models.deletion.PROTECT,
                    to='contenttypes.contenttype')),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_propertyvalue_creation',
                                                 to=settings.AUTH_USER_MODEL)),
                ('property_type',
                 models.ForeignKey(help_text='Property type', on_delete=django.db.models.deletion.PROTECT,
                                   related_name='property_values', to='fms_core.propertytype')),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT,
                                                 related_name='fms_core_propertyvalue_modification',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.RunPython(
            create_infinium_property_types_and_protocols,
            reverse_code=migrations.RunPython.noop,
        ),

    ]
