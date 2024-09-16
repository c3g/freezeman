import reversion
from django.db import migrations
from django.contrib.auth.models import User

ADMIN_USERNAME = 'biobankadmin'

def add_library_types(apps, schema_editor):
    NEW_LIBRARY_TYPE_NAMES = ["10x_Genomics_SC_ATAC_Multiome",
                              "10x_Genomics_SC_RNA_Multiome",
                              "scRNA-Seq"]
    
    LibraryType = apps.get_model("fms_core", "LibraryType")

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)

        reversion.set_comment("Add new library types to be supported for ready to sequence.")
        reversion.set_user(admin_user)
    
        for library_name in NEW_LIBRARY_TYPE_NAMES:
            library_type = LibraryType.objects.create(name=library_name,
                                                      created_by_id=admin_user.id,
                                                      updated_by_id=admin_user.id)
            reversion.add_to_revision(library_type)


class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0064_v4_11_0'),
    ]

    operations = [
        migrations.RunPython(
            add_library_types,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
