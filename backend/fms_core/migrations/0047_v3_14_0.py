from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User
import reversion
import re

ADMIN_USERNAME = 'biobankadmin'

def populate_library_selection(apps, schema_editor):
    """
    We add one library_selection entry for each Capture type and ChIP-Seq mark.

    Args:
        apps: apps class handle
        schema_editor: ignore
    """

    LIBRARY_SELECTION = [
      # (name, target),
      ("Capture", "Exome"),
      ("Capture", "MCC"),
      ("Capture", "Panel"),
      # ChIP-Seq marks are only commonly used ones. New entries will have to be done for experiments that use different ones.
      ("ChIP-Seq", "H3K4me1"),
      ("ChIP-Seq", "H3K27ac"),
      ("ChIP-Seq", "H3K4me3"),
      ("ChIP-Seq", "H3K36me3"),
      ("ChIP-Seq", "H3K27me3"),
      ("ChIP-Seq", "H3K9me3"),
    ]

    LibrarySelection = apps.get_model("fms_core", "LibrarySelection")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Populate library_selection table with the name and target of valid selection methods.")
        reversion.set_user(admin_user)

        for name, target in LIBRARY_SELECTION:
            library_selection = LibrarySelection.objects.create(name=name,
                                                                target=target,
                                                                created_by_id=admin_user_id,
                                                                updated_by_id=admin_user_id)
            reversion.add_to_revision(library_selection)


def create_library_capture_objects(apps, schema_editor):
    Protocol = apps.get_model("fms_core", "Protocol")
    PropertyType = apps.get_model("fms_core", "PropertyType")
    ContentType = apps.get_model('contenttypes', 'ContentType')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create objects related to the Library capture protocol")
        reversion.set_user(admin_user)

        # Create PropertyType and Protocols
        PROPERTY_TYPES_BY_PROTOCOL = {
            "Library Capture": [
                ("Capture Technician Name", "str"),
                ("Library Kit Used", "str"),
                ("Library Kit Lot", "str"),
                ("Baits Used", "str"),
                ("Thermocycler Used", "str"),
                ("PCR Cycles", "str"),
                ("PCR Enzyme Used", "str"),
                ("PCR Enzyme Lot", "str"),
            ]
        }
        protocol_content_type = ContentType.objects.get_for_model(Protocol)

        for protocol_name in PROPERTY_TYPES_BY_PROTOCOL.keys():
            protocol = Protocol.objects.create(name=protocol_name, created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(protocol)

            for (property, value_type) in PROPERTY_TYPES_BY_PROTOCOL[protocol_name]:
                if any([property == 'Library Technician Name', property == 'Library Kit Used', property == 'Library Kit Lot', property == 'Baits Used']):
                    is_optional = False
                else:
                    is_optional = True
                pt = PropertyType.objects.create(name=property,
                                                 object_id=protocol.id,
                                                 content_type=protocol_content_type,
                                                 value_type=value_type,
                                                 is_optional=is_optional,
                                                 created_by_id=admin_user_id,
                                                 updated_by_id=admin_user_id)
                reversion.add_to_revision(pt)

def add_library_type_chipseq(apps, schema_editor):
    LibraryType = apps.get_model("fms_core", "LibraryType")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment(f"Add ChIP-Seq to the library_type table.")
        reversion.set_user(admin_user)

        library_type = LibraryType.objects.create(name="ChIP-Seq",
                                                  created_by_id=admin_user_id,
                                                  updated_by_id=admin_user_id)
        reversion.add_to_revision(library_type)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0046_v3_14_0'),
    ]

    operations = [
        migrations.CreateModel(
            name='LibrarySelection',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date the instance was created.')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Date the instance was modified.')),
                ('deleted', models.BooleanField(default=False, help_text='Whether this instance has been deleted.')),
                ('name', models.CharField(help_text='The name of the library selection protocol.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('target', models.CharField(help_text='The target of the selection protocol.', max_length=200, validators=[django.core.validators.RegexValidator(re.compile('^[a-zA-Z0-9.\\-_]{1,200}$'))])),
                ('created_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_libraryselection_creation', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, on_delete=django.db.models.deletion.PROTECT, related_name='fms_core_libraryselection_modification', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='library',
            name='library_selection',
            field=models.ForeignKey(blank=True, help_text='Library selection used on the library.', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='libraries', to='fms_core.libraryselection'),
        ),
        migrations.AddConstraint(
            model_name='libraryselection',
            constraint=models.UniqueConstraint(fields=('name', 'target'), name='libraryselection_name_target_key'),
        ),
        migrations.RunPython(
            populate_library_selection,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            create_library_capture_objects,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RunPython(
            add_library_type_chipseq,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
