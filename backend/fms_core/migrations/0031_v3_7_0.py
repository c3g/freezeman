from django.conf import settings
from django.db import migrations, models
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

# Breaking down to start simple
INDEX_SETS = {
    "IDT_10nt_UDI_TruSeq_Adapter",
    "IDT_UDI_UMI_384",
    "IDT_for_Illumina_TruSeq_DNA_and_RNA_UD",
    "Agilent_SureSelect_XT_V2",
    "MGIEasy_PF_Adapter",
    "MGIEasy_UDB_Primers_Adapter",
}

INDEX_STRUCTURES = {
    "TruSeqHT": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCTACAC", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "Nextera": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "TruSeqLT": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "smallTMPrnaRPI": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "smallrnaRPI": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "IDTStubby": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "UMITruSeqHT": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "tenX_sc_RNA_v1": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "tenX_sc_RNA_v2": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "tenX_DNA_v2": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "smartseq2": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "tenX_sc_ATAC_v1": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "FeatureBarcode": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "tenX_sc_RNA_visium_v2": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
    "mirna_qiagen": {"flanker_5prime_forward": "", "flanker_5prime_reverse": "", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",},
}


def import_indices(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0030_v3_6_0'),
    ]

    operations = [
        migrations.RunPython(
            import_indices,
            reverse_code=migrations.RunPython.noop,
        )
    ]