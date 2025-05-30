
from django.db import migrations
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

def add_olink_library_types(apps, schema_editor):
    NEW_LIBRARY_TYPE_NAMES = ["Olink_Explore_HT",
                              "Olink_Explore_3K",
                              "Olink_Explore_384",
                              "Olink_Explore_Reveal"]
    
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

def create_empty_index(apps, schema_editor):
    Index = apps.get_model("fms_core", "Index")
    IndexSet = apps.get_model("fms_core", "IndexSet")
    IndexBySet = apps.get_model("fms_core", "IndexBySet")
    IndexStructure = apps.get_model("fms_core", "IndexStructure")
    Sequence = apps.get_model("fms_core", "Sequence")

    NEW_INDEX_SET = "Olink_Set1_Default"
    NEW_INDEX = "UNKNOWN_INDEX"
    NEW_INDEX_STRUCTURE = {
        "name": "Empty_Index_Structure",
        "flanker_5prime_forward": "",
        "flanker_5prime_reverse": "",
        "flanker_3prime_forward": "",
        "flanker_3prime_reverse": ""
    }

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment("Create new empty index set and index structure for Olink library types.")
        reversion.set_user(admin_user)

        # Create set
        index_set = IndexSet.objects.create(name=NEW_INDEX_SET, created_by_id=admin_user.id, updated_by_id=admin_user.id)
        reversion.add_to_revision(index_set)

        # Create structure
        flanker_5prime_forward, _ = Sequence.objects.get_or_create(value=NEW_INDEX_STRUCTURE["flanker_5prime_forward"],
                                                                   defaults={"created_by_id": admin_user.id, "updated_by_id": admin_user.id})
        flanker_5prime_reverse, _ = Sequence.objects.get_or_create(value=NEW_INDEX_STRUCTURE["flanker_5prime_reverse"],
                                                                   defaults={"created_by_id": admin_user.id, "updated_by_id": admin_user.id})
        flanker_3prime_forward, _ = Sequence.objects.get_or_create(value=NEW_INDEX_STRUCTURE["flanker_3prime_forward"],
                                                                   defaults={"created_by_id": admin_user.id, "updated_by_id": admin_user.id})
        flanker_3prime_reverse, _ = Sequence.objects.get_or_create(value=NEW_INDEX_STRUCTURE["flanker_3prime_reverse"],
                                                                   defaults={"created_by_id": admin_user.id, "updated_by_id": admin_user.id})
        index_structure = IndexStructure.objects.create(
            name=NEW_INDEX_STRUCTURE["name"],
            flanker_5prime_forward=flanker_5prime_forward,
            flanker_5prime_reverse=flanker_5prime_reverse,
            flanker_3prime_forward=flanker_3prime_forward,
            flanker_3prime_reverse=flanker_3prime_reverse,
            created_by_id=admin_user.id,
            updated_by_id=admin_user.id
        )
        reversion.add_to_revision(flanker_5prime_forward)
        reversion.add_to_revision(flanker_5prime_reverse)
        reversion.add_to_revision(flanker_3prime_forward)
        reversion.add_to_revision(flanker_3prime_reverse)
        reversion.add_to_revision(index_structure)

        # Create index
        index = Index.objects.create(name=NEW_INDEX, index_structure=index_structure,
                                     created_by_id=admin_user.id, updated_by_id=admin_user.id)
        reversion.add_to_revision(index)

        # Create IndexBySet
        index_by_set = IndexBySet.objects.create(index=index, index_set=index_set,
                                                 created_by_id=admin_user.id, updated_by_id=admin_user.id)
        reversion.add_to_revision(index_by_set)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0069_v5_0_0'),
    ]

    operations = [
        migrations.RunPython(add_olink_library_types, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_empty_index, reverse_code=migrations.RunPython.noop),
    ]
