from django.conf import settings
from django.db import migrations, models
from django.contrib.auth.models import User
import reversion

ADMIN_USERNAME = 'biobankadmin'

# Breaking down to start simple
INDEX_SETS = [
    "Illumina_TruSeq_DNA_RNA",
    "Illumina_TruSeq_smRNA",
    "Illumina_Nextera",
    "Illumina_TruSeq_Amplicon",
    "Illumina_TruSeq_HT",
    "Omixon",
    "Agilent_Haloplex",
    "Nextera_ATAC_Series",
    "IDT_10nt_UDI_TruSeq_Adapter",
    "IDT_non-UMI_Unique_Dual_Index",
    "IDT_UMI_Unique_Dual_Index",
    "IDT_384_UMI_Unique_Dual_Index",
    "IDT_Nextera_Compatible_UDI",
    "Illumina_IDT_Nextera_UDP_V1",
    "Illumina_IDT_Nextera_UDP_V2",
    "Illumina_IDT_TruSeq_UDI_V1",
    "Illumina_IDT_TruSeq_UDI_V2",
    "Sure_Select_HT_Low_Input",
    "10x_Genomics_scDNA_scRNA_V2_Linked_Reads",
    "10x_Genomics_scRNA_V1",
    "10x_Genomics_scATAC",
    "10x_Genomics_Dual_Index_NT_Series",
    "Agilent_SureSelect_XT",
    "Agilent_SureSelect_XT_V2_96",
    "Agilent_SureSelect_XT_V2_384",
    "SeqWell_Indexes",
    "Schloss_Indexes",
    "Swift_Adapter",
    "Perkin_Elmer_BioO_NextFlexChIPSeq_NOVA-514120_NOVA-514121_NOVA-514122_NOVA-514123",
    "IBIS_Custom_Combinatorial_Dual_Index",
    "OvationSolo_RNASeq_S02221_S02238_S02574",
    "GeoMx_DSP_index",
    "QIAgen_miRNA",
    "MGIEasy_PF_Adapter",
    "MGIEasy_UDB_Primers_Adapter",
    "NEBNext_Unique_Dual_Index_non-UMI_Set1_NEB_#E6440",
    "NEBNext_Unique_Dual_Index_non-UMI_Set2_NEB_#E6442",
    "NEBNext_Unique_Dual_Index_non-UMI_Set3_NEB_#E6444",
    "NEBNext_Unique_Dual_Index_non-UMI_Set4_NEB_#E6446",
    "NEBNext_Multiplex_Oligos_for_Illumina_Index_Primers_Sets_1-2-3-4_NEB_#E7335_#E7500_#E7710_#E7730",
]

INDEX_STRUCTURES = {
    "TruSeqHT": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCTACAC", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "Nextera": {"flanker_5prime_forward": "TCGTCGGCAGCGTCAGATGTGTATAAGAGACAG", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCTACAC", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "CTGTCTCTTATACACATCTCCGAGCCCACGAGAC",},
    "TruSeqLT": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCT", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "smallTMPrnaRPI": {"flanker_5prime_forward": "ACACGTTCAGAGTTCTACAGTCCGA", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCT", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "TGGAATTCTCGGGTGCCAAGGAACTCCAGTCAC",},
    "smallrnaRPI": {"flanker_5prime_forward": "ACACGTTCAGAGTTCTACAGTCCGA", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCT", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "TGGAATTCTCGGGTGCCAAGGAGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "IDTStubby": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCTACAC", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "UMITruSeqHT": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCTACAC", "flanker_3prime_forward": "", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "tenX_sc_RNA_v1": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCT", "flanker_3prime_forward": "", "flanker_3prime_reverse": "",}, # 10x Barcode replaces index ?
    "tenX_sc_RNA_v2": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCT", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "tenX_DNA_v2": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCT", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "smartseq2": {"flanker_5prime_forward": "TCGTCGGCAGCGTCAGATGTGTATAAGAGACAG", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCTACAC", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "CTGTCTCTTATACACATCTCCGAGCCCACGAGAC",},
    "tenX_sc_ATAC_v1": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCT", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "FeatureBarcode": {"flanker_5prime_forward": "TCGTCGGCAGCGTCAGATGTGTATAAGAGACAG", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCT", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "tenX_sc_RNA_visium_v2": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCTACAC", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
    "mirna_qiagen": {"flanker_5prime_forward": "ACACTCTTTCCCTACACGACGCTCTTCCGATCT", "flanker_5prime_reverse": "AATGATACGGCGACCACCGAGATCTCCCCCCCCCC", "flanker_3prime_forward": "ATCTCGTATGCCGTCTTCTGCTTG", "flanker_3prime_reverse": "AGATCGGAAGAGCACACGTCTGAACTCCAGTCAC",},
}
def import_index_structures(apps, schema_editor):
    IndexSet = apps.get_model('fms_core', 'IndexSet')
    IndexStructure = apps.get_model('fms_core', 'IndexStructure')
    Sequence = apps.get_model('fms_core', 'Sequence')

    with reversion.create_revision(manage_manually=True):
        admin_user = User.objects.get(username=ADMIN_USERNAME)
        admin_user_id = admin_user.id

        reversion.set_comment("Create objects related to Indices in Freezeman.")
        reversion.set_user(admin_user)

        # create sets
        sets_obj_dict = {}
        for index_set in INDEX_SETS:
            sets_obj_dict[index_set] = IndexSet.objects.create(name=index_set, created_by_id=admin_user_id, updated_by_id=admin_user_id)
            reversion.add_to_revision(sets_obj_dict[index_set])

        # create structures
        structures_obj_dict = {}
        for structure_name, structure_value in INDEX_STRUCTURES.items():
            flanker_5prime_forward, _ = Sequence.objects.get_or_create(value=structure_value.get("flanker_5prime_forward", ""),
                                                                       defaults={"created_by_id": admin_user_id, "updated_by_id": admin_user_id})
            flanker_5prime_reverse, _ = Sequence.objects.get_or_create(value=structure_value.get("flanker_5prime_reverse", ""),
                                                                       defaults={"created_by_id": admin_user_id, "updated_by_id": admin_user_id})
            flanker_3prime_forward, _ = Sequence.objects.get_or_create(value=structure_value.get("flanker_3prime_forward", ""),
                                                                       defaults={"created_by_id": admin_user_id, "updated_by_id": admin_user_id})
            flanker_3prime_reverse, _ = Sequence.objects.get_or_create(value=structure_value.get("flanker_3prime_reverse", ""),
                                                                       defaults={"created_by_id": admin_user_id, "updated_by_id": admin_user_id})                                                        
            structures_obj_dict[structure_name] = IndexStructure.objects.create(name=structure_name,
                                                                                flanker_5prime_forward=flanker_5prime_forward,
                                                                                flanker_5prime_reverse=flanker_5prime_reverse,
                                                                                flanker_3prime_forward=flanker_3prime_forward,
                                                                                flanker_3prime_reverse=flanker_3prime_reverse,
                                                                                created_by_id=admin_user_id,
                                                                                updated_by_id=admin_user_id)
            reversion.add_to_revision(flanker_5prime_forward)
            reversion.add_to_revision(flanker_5prime_reverse)
            reversion.add_to_revision(flanker_3prime_forward)
            reversion.add_to_revision(flanker_3prime_reverse)
            reversion.add_to_revision(structures_obj_dict[structure_name])
                
class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('fms_core', '0031_v3_7_0'),
    ]

    operations = [
        migrations.RunPython(
            import_index_structures,
            reverse_code=migrations.RunPython.noop,
        )
    ]