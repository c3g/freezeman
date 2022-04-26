from django.conf import settings
import django.core.validators
from django.contrib.auth.models import User
from django.db import migrations, models
import django.db.models.deletion
import re
import reversion

ADMIN_USERNAME = 'biobankadmin'

def create_library_preparation_objects(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create objects related to the Library preparation protocol")
        reversion.set_user(admin_user)

        # Create PropertyType and Protocols
        PROPERTY_TYPES_BY_PROTOCOL = {
            "Library Preparation": [
                                  ("Library Technician Name", "str"),
                                  ("Shearing Technician Name", "str"),
                                  ("Shearing Method", "str"),
                                  ("Shearing Size (bp)", "str"),
                                  ("Library Kit Used", "str"),
                                  ("Library Kit Lot", "str"),
                                  ("Thermocycler Used", "str"),
                                  ("PCR Cycles", "str"),
                                  ("PCR Enzyme Used", "str"),
                                  ("PCR Enzyme Lot", "str"),
                                  ("EZ-96 DNA Methylation-Gold MagPrep Lot", "str")
                                 ]
        }
        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name, created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            for (property, value_type) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                if any([property == 'Library Technician Name', property == 'Library Kit Used', property == 'Library Kit Lot']):
                    is_optional = False
                else:
                    is_optional = True
                pt = PropertyType.objects.create(name=property,
                                                 object_id=protocol.id,
                                                 content_type=protocol_content_type,
                                                 value_type=value_type,
                                                 is_optional=is_optional,
                                                 created_by_id=admin_user_id, updated_by_id=admin_user_id)
                reversion.add_to_revision(pt)

def create_initial_library_types(apps, schema_editor):
    LibraryType = apps.get_model("fms_core", "LibraryType")

    LIBRARY_TYPES = ["PCR-free",
                     "PCR-enriched",
                     "RNASeq",
                     "WGBS",
                     "16S",
                     "18S",
                     "miRNA",]
    
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create objects related to the Sample Selection using qPCR protocol")
        reversion.set_user(admin_user)

        for library_type_name in LIBRARY_TYPES:
            library_type = LibraryType.objects.create(name=library_type_name, created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(library_type)

def add_tissue_sample_kind(apps, schema_editor):
    SampleKind = apps.get_model("fms_core", "SampleKind")
    with reversion.create_revision(manage_manually=True):
        admin_id = User.objects.get(username="biobankadmin").id
        tissue_sample_kind = SampleKind.objects.create(name='TISSUE', created_by_id=admin_id, updated_by_id=admin_id)
        reversion.add_to_revision(tissue_sample_kind)

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0032_v3_7_0'),
    ]

    operations = [
        migrations.RunPython(
            create_library_preparation_objects,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='derivedsample',
            name='index',
        ),
        migrations.CreateModel(
            name='LibraryType',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='The name of the library type.', max_length=200, unique=True, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_librarytype_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_librarytype_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Library',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('library_size', models.DecimalField(blank=True, decimal_places=0, help_text='Average size of the nucleic acid strands in base pairs.', max_digits=20, null=True)),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_library_creation', to=settings.AUTH_USER_MODEL)),
                ('index', models.ForeignKey(help_text='The index associated to this library.', on_delete=django.db.models.deletion.PROTECT, related_name='libraries', to='fms_core.index')),
                ('library_type', models.ForeignKey(help_text='Library type describing the library.', on_delete=django.db.models.deletion.PROTECT, related_name='libraries', to='fms_core.librarytype')),
                ('platform', models.ForeignKey(help_text='The platform for which the library has been prepared.', on_delete=django.db.models.deletion.PROTECT, related_name='libraries', to='fms_core.platform')),
                ('strandedness', models.CharField(choices=[('Double stranded', 'Double stranded'), ('Single stranded', 'Single stranded')], help_text='Number of Library NA strands.', max_length=20)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_library_modification', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='derivedsample',
            name='library',
            field=models.OneToOneField(blank=True, help_text='Library associated to this Derived Sample.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='derived_sample', to='fms_core.library'),
        ),
        migrations.RunPython(
            create_initial_library_types,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            add_tissue_sample_kind,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name='derivedsample',
            name='tissue_source',
            field=models.CharField(blank=True, choices=[('BAL', 'BAL'), ('Biopsy', 'Biopsy'), ('Blood', 'Blood'), ('Buffy coat', 'Buffy coat'), ('Cells', 'Cells'), ('Expectoration', 'Expectoration'), ('Gargle', 'Gargle'), ('Plasma', 'Plasma'), ('Saliva', 'Saliva'), ('Swab', 'Swab'), ('Tail', 'Tail'), ('Tissue', 'Tissue'), ('Tumor', 'Tumor')], help_text='Can only be specified if the biospecimen type is DNA or RNA.', max_length=200),
        ),
    ]
