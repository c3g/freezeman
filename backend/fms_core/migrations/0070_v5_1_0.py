
from django.db import migrations
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

UNKNOWN_INDEX_NAME = "UNKNOWN_INDEX"
def create_empty_index(apps, schema_editor):
    Index = apps.get_model("fms_core", "Index")
    IndexStructure = apps.get_model("fms_core", "IndexStructure")
    Sequence = apps.get_model("fms_core", "Sequence")

    NO_FLANKERS_INDEX_STRUCTURE_NAME = "No_Flankers"

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create index '{UNKNOWN_INDEX_NAME}' and its structure '{NO_FLANKERS_INDEX_STRUCTURE_NAME}'.")
        reversion.set_user(admin_user)

        # Create empty sequence
        empty_sequence, _ = Sequence.objects.get_or_create(value="",
                                                           defaults={"created_by_id": admin_user.id, "updated_by_id": admin_user.id})

        # Create index structure with no flankers
        index_structure = IndexStructure.objects.create(
            name=NO_FLANKERS_INDEX_STRUCTURE_NAME,
            flanker_5prime_forward=empty_sequence,
            flanker_5prime_reverse=empty_sequence,
            flanker_3prime_forward=empty_sequence,
            flanker_3prime_reverse=empty_sequence,
            created_by_id=admin_user.id,
            updated_by_id=admin_user.id
        )

        # Create index
        index = Index.objects.create(name=UNKNOWN_INDEX_NAME, index_structure=index_structure,
                                     created_by_id=admin_user.id, updated_by_id=admin_user.id)

        reversion.add_to_revision(empty_sequence)
        reversion.add_to_revision(index_structure)
        reversion.add_to_revision(index)

def create_olink_index_set(apps, schema_editor):
    IndexSet = apps.get_model("fms_core", "IndexSet")
    IndexBySet = apps.get_model("fms_core", "IndexBySet")
    Index = apps.get_model("fms_core", "Index")

    OLINK_INDEX_SET = "Olink_Default_Index_Set"
    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment(f"Create index set '{OLINK_INDEX_SET}' for Olink library types.")
        reversion.set_user(admin_user)

        # Create set
        index_set = IndexSet.objects.create(name=OLINK_INDEX_SET, created_by_id=admin_user.id, updated_by_id=admin_user.id)
        reversion.add_to_revision(index_set)

        # Create IndexBySet
        index = Index.objects.get(name=UNKNOWN_INDEX_NAME)  # Assuming create_empty_index function has already run
        index_by_set = IndexBySet.objects.create(index=index, index_set=index_set,
                                                 created_by_id=admin_user.id, updated_by_id=admin_user.id)
        reversion.add_to_revision(index_by_set)

def create_olink_library_types(apps, schema_editor):
    NEW_LIBRARY_TYPE_NAMES = ["Olink_Explore_HT",
                              "Olink_Explore_3072",
                              "Olink_Explore_384",
                              "Olink_Reveal"]
    
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

def selection_and_selection_targets_for_olink(apps, schema_editor):
    LibrarySelection = apps.get_model("fms_core", "LibrarySelection")

    SELECTION_NAME = "Olink_Explore_Panel"
    SELECTION_TARGETS = [
        "Cardiometabolic",
        "Cardiometabolic II",
        "Inflammation",
        "Inflammation II",
        "Neurology",
        "Neurology II",
        "Oncology",
        "Oncology II",
    ]

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        reversion.set_comment("Add library selection and targets for Olink library types.")
        reversion.set_user(admin_user)

        # Create LibrarySelections for Olink
        for target in SELECTION_TARGETS:
            olink_selection = LibrarySelection.objects.create(
                name=SELECTION_NAME,
                target=target,
                created_by_id=admin_user.id,
                updated_by_id=admin_user.id
            )
            reversion.add_to_revision(olink_selection)

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0069_v5_0_0'),
    ]

    operations = [
        migrations.RunPython(create_empty_index, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_olink_index_set, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(create_olink_library_types, reverse_code=migrations.RunPython.noop),
        migrations.RunPython(selection_and_selection_targets_for_olink, reverse_code=migrations.RunPython.noop),
    ]
