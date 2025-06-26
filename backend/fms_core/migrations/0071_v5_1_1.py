from django.db import migrations
from django.contrib.auth.models import User
import reversion

from fms_core.migrations.helper import is_test_migration

def create_new_indices(apps, schema_editor):
    NEW_INDEX_SETS = {
        "Illumina_Single_Cell_Prep_UDI_Mix_Strip": [
            "SCUDP0017_i7-SCUDP0017_i5",
            "SCUDP0021_i7-SCUDP0021_i5"
        ],
        "Singleron_GEXSCOPE_Single_Cell_RNA_Library_Kit": [
            "GEX_UDI01_i7-GEX_UDI01_i5",
            "GEX_UDI04_i7-GEX_UDI04_i5"
        ]
    }

    if not is_test_migration(apps):
        Index = apps.get_model("fms_core", "Index")
        IndexStructure = apps.get_model("fms_core", "IndexStructure")
        Sequence = apps.get_model("fms_core", "Sequence")
        pass

class Migration(migrations.Migration):

    dependencies = [
        ('fms_core', '0070_v5_1_0'),
    ]

    operations = [
    ]
