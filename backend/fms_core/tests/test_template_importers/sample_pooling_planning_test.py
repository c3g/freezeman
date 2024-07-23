from django.test import TestCase
from datetime import datetime
from decimal import Decimal
import zipfile
from io import BytesIO

from fms_core.template_importer.importers import SamplePoolingPlanningImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models._constants import DOUBLE_STRANDED
from fms_core.models import SampleKind

from fms_core.services.container import create_container, get_container
from fms_core.services.sample import create_full_sample
from fms_core.services.platform import get_platform
from fms_core.services.library import get_library_type, create_library
from fms_core.services.index import get_or_create_index_set, create_index, create_indices_3prime_by_sequence, create_indices_5prime_by_sequence


class SamplePoolingplanningTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = SamplePoolingPlanningImporter()
        self.files = [APP_DATA_ROOT / "Sample_pooling_planning_v4_9_0.xlsx"]

        self.INDICES = [{"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_001-IDT_10nt_UDI_i5_001", "sequence_3_prime": ["ACAAAGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_002-IDT_10nt_UDI_i5_002", "sequence_3_prime": ["ACTTTGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_003-IDT_10nt_UDI_i5_003", "sequence_3_prime": ["ACAATGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_004-IDT_10nt_UDI_i5_004", "sequence_3_prime": ["ACATTGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_005-IDT_10nt_UDI_i5_005", "sequence_3_prime": ["ACTATGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_006-IDT_10nt_UDI_i5_006", "sequence_3_prime": ["ATAATGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_007-IDT_10nt_UDI_i5_007", "sequence_3_prime": ["TCAATGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_008-IDT_10nt_UDI_i5_008", "sequence_3_prime": ["AGAATGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_009-IDT_10nt_UDI_i5_009", "sequence_3_prime": ["ACAGTGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_010-IDT_10nt_UDI_i5_010", "sequence_3_prime": ["ACAAGGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                       ]

        self.DNA_sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
        self.plate_source_name_and_barcode = "SRC_PLATE_POOL"
        self.source_sample_initial_volume = 100

        self.prefill_data()


    def prefill_data(self):
        platform_illumina, _, _ = get_platform(name="ILLUMINA")
        library_type, _, _ = get_library_type(name="WGBS")

        # Create indices
        indices = {}
        for i, index in enumerate(self.INDICES):
            (index_set, _, _, _) = get_or_create_index_set(set_name=index["index_set"])
            (indices[i], _, _) = create_index(index_set=index_set, index_structure=index["index_structure"],
                                              index_name=index["index_name"])
            create_indices_3prime_by_sequence(indices[i], index["sequence_3_prime"])
            create_indices_5prime_by_sequence(indices[i], index["sequence_5_prime"])

        libraries = [None] * 10
        for i, _ in enumerate(libraries):
            libraries[i], _, _ = create_library(index=indices[i],
                                                library_type=library_type,
                                                platform=platform_illumina,
                                                strandedness=DOUBLE_STRANDED)

        containers_info = [
            {"barcode": self.plate_source_name_and_barcode, "name": self.plate_source_name_and_barcode, "kind": "96-well plate", "location": None, "coordinates": None,},
        ]

        samples_info = [
            {"name": "Sample1PoolPlanning", "volume": self.source_sample_initial_volume, "conc.": 25, "container_barcode": self.plate_source_name_and_barcode, "coordinates": "B01", "library": libraries[0], "fragment_size": 380},
            {"name": "Sample2PoolPlanning", "volume": self.source_sample_initial_volume, "conc.": 50, "container_barcode": self.plate_source_name_and_barcode, "coordinates": "B02", "library": libraries[1], "fragment_size": 380},
            {"name": "Sample3PoolPlanning", "volume": self.source_sample_initial_volume, "conc.": 10, "container_barcode": self.plate_source_name_and_barcode, "coordinates": "C01", "library": libraries[2], "fragment_size": 380},
            {"name": "Sample4PoolPlanning", "volume": self.source_sample_initial_volume, "conc.": 60, "container_barcode": self.plate_source_name_and_barcode, "coordinates": "A01", "library": libraries[3], "fragment_size": 380},
            {"name": "Sample5PoolPlanning", "volume": self.source_sample_initial_volume, "conc.": 40, "container_barcode": self.plate_source_name_and_barcode, "coordinates": "A02", "library": libraries[4], "fragment_size": 380},
            {"name": "Sample6PoolPlanning", "volume": self.source_sample_initial_volume, "conc.": 80, "container_barcode": self.plate_source_name_and_barcode, "coordinates": "A03", "library": libraries[5], "fragment_size": 380},
            {"name": "Sample7PoolPlanning", "volume": self.source_sample_initial_volume, "conc.": 25, "container_barcode": self.plate_source_name_and_barcode, "coordinates": "E01", "library": libraries[6], "fragment_size": 380},
            {"name": "Sample8PoolPlanning", "volume": self.source_sample_initial_volume, "conc.": 50, "container_barcode": self.plate_source_name_and_barcode, "coordinates": "E08", "library": libraries[7], "fragment_size": 380},
            {"name": "Sample9PoolPlanning", "volume": self.source_sample_initial_volume, "conc.": 10, "container_barcode": self.plate_source_name_and_barcode, "coordinates": "E12", "library": libraries[8], "fragment_size": 380},
            {"name": "Sample10PoolPlanning", "volume": self.source_sample_initial_volume, "conc.": 25, "container_barcode": self.plate_source_name_and_barcode, "coordinates": "D01", "library": libraries[9], "fragment_size": 380},
        ]

        for info in containers_info:
            location, _, _ = get_container(barcode=info["location"]) if info["location"] is not None else (None, [], [])
            create_container(barcode=info["barcode"], name=info["name"], kind=info["kind"], container_parent=location, coordinates=info["coordinates"])

        for info in samples_info:
            container, _, _ = get_container(barcode=info["container_barcode"])

            sample, _, _ = create_full_sample(name=info["name"],
                                              volume=info["volume"],
                                              concentration=info["conc."],
                                              collection_site="site1",
                                              creation_date=datetime(2022, 7, 5, 0, 0),
                                              container=container,
                                              coordinates=info["coordinates"],
                                              sample_kind=self.DNA_sample_kind,
                                              library=info["library"],
                                              fragment_size=info["fragment_size"])

    def test_import(self):
        for file in self.files:
            # Basic test for all templates - checks that template is valid
            result = load_template(importer=self.importer, file=file)
            self.assertEqual(result["valid"], True)

            if result['valid']:
                content_zipped = zipfile.ZipFile(BytesIO(result['output_file']['content']))
                for filename in content_zipped.namelist():
                    if filename[-5:] != ".xlsx":  # At the moment we only test the csv output files.
                        csv_content = {}
                        with content_zipped.open(filename) as zfile:   
                            for i, line in enumerate(zfile):
                                csv_content[i] = line.decode().strip().split(",") # Extract file into dictionary

                        if filename.find("Container_Mapping_") != -1:
                            # 0: robot position
                            # 1: barcode
                            
                            # skip first line (header)
                            # first source container
                            self.assertEqual(csv_content[1][0], "Src1")
                            self.assertEqual(csv_content[1][1], "SRC_PLATE_POOL")
                            # skip separator line
                            # first destination container
                            self.assertEqual(csv_content[3][0], "TubeDst1")
                            self.assertEqual(csv_content[3][1].split("_")[0], "Poolette")
                            # first destination container
                            self.assertEqual(csv_content[4][0], "TubeDst2")
                            self.assertEqual(csv_content[4][1].split("_")[0], "Pooliche")
                        else:
                            ROBOT_SRC_BARCODE = 0
                            ROBOT_SRC_COORD = 1
                            ROBOT_DST_BARCODE = 2
                            ROBOT_DST_COORD = 3
                            VOLUME_DILUENT = 4
                            VOLUME_SAMPLE = 5

                            # First sample
                            self.assertEqual(csv_content[1][ROBOT_SRC_BARCODE], "Src1")
                            self.assertEqual(csv_content[1][ROBOT_SRC_COORD], "1")
                            self.assertEqual(csv_content[1][ROBOT_DST_BARCODE], "TubeDst")
                            self.assertEqual(csv_content[1][ROBOT_DST_COORD], "1")
                            self.assertEqual(csv_content[1][VOLUME_DILUENT], "0")
                            self.assertEqual(csv_content[1][VOLUME_SAMPLE], "33.333")
                            # Second sample
                            self.assertEqual(csv_content[2][ROBOT_SRC_BARCODE], "Src1")
                            self.assertEqual(csv_content[2][ROBOT_SRC_COORD], "2")
                            self.assertEqual(csv_content[2][ROBOT_DST_BARCODE], "TubeDst")
                            self.assertEqual(csv_content[2][ROBOT_DST_COORD], "1")
                            self.assertEqual(csv_content[2][VOLUME_DILUENT], "0")
                            self.assertEqual(csv_content[2][VOLUME_SAMPLE], "80.000")
                            # Third sample
                            self.assertEqual(csv_content[3][ROBOT_SRC_BARCODE], "Src1")
                            self.assertEqual(csv_content[3][ROBOT_SRC_COORD], "3")
                            self.assertEqual(csv_content[3][ROBOT_DST_BARCODE], "TubeDst")
                            self.assertEqual(csv_content[3][ROBOT_DST_COORD], "1")
                            self.assertEqual(csv_content[3][VOLUME_DILUENT], "0")
                            self.assertEqual(csv_content[3][VOLUME_SAMPLE], "100.000")
                            # Fourth sample
                            self.assertEqual(csv_content[4][ROBOT_SRC_BARCODE], "Src1")
                            self.assertEqual(csv_content[4][ROBOT_SRC_COORD], "9")
                            self.assertEqual(csv_content[4][ROBOT_DST_BARCODE], "TubeDst")
                            self.assertEqual(csv_content[4][ROBOT_DST_COORD], "1")
                            self.assertEqual(csv_content[4][VOLUME_DILUENT], "0")
                            self.assertEqual(csv_content[4][VOLUME_SAMPLE], "50.000")
                            # Fifth sample
                            self.assertEqual(csv_content[5][ROBOT_SRC_BARCODE], "Src1")
                            self.assertEqual(csv_content[5][ROBOT_SRC_COORD], "10")
                            self.assertEqual(csv_content[5][ROBOT_DST_BARCODE], "TubeDst")
                            self.assertEqual(csv_content[5][ROBOT_DST_COORD], "1")
                            self.assertEqual(csv_content[5][VOLUME_DILUENT], "0")
                            self.assertEqual(csv_content[5][VOLUME_SAMPLE], "40.000")
                            # Sixth sample
                            self.assertEqual(csv_content[6][ROBOT_SRC_BARCODE], "Src1")
                            self.assertEqual(csv_content[6][ROBOT_SRC_COORD], "4")
                            self.assertEqual(csv_content[6][ROBOT_DST_BARCODE], "TubeDst")
                            self.assertEqual(csv_content[6][ROBOT_DST_COORD], "2")
                            self.assertEqual(csv_content[6][VOLUME_DILUENT], "0")
                            self.assertEqual(csv_content[6][VOLUME_SAMPLE], "80.000")
                            # Seventh sample
                            self.assertEqual(csv_content[7][ROBOT_SRC_BARCODE], "Src1")
                            self.assertEqual(csv_content[7][ROBOT_SRC_COORD], "5")
                            self.assertEqual(csv_content[7][ROBOT_DST_BARCODE], "TubeDst")
                            self.assertEqual(csv_content[7][ROBOT_DST_COORD], "2")
                            self.assertEqual(csv_content[7][VOLUME_DILUENT], "0")
                            self.assertEqual(csv_content[7][VOLUME_SAMPLE], "80.000")
                            # Eighth sample
                            self.assertEqual(csv_content[8][ROBOT_SRC_BARCODE], "Src1")
                            self.assertEqual(csv_content[8][ROBOT_SRC_COORD], "17")
                            self.assertEqual(csv_content[8][ROBOT_DST_BARCODE], "TubeDst")
                            self.assertEqual(csv_content[8][ROBOT_DST_COORD], "2")
                            self.assertEqual(csv_content[8][VOLUME_DILUENT], "0")
                            self.assertEqual(csv_content[8][VOLUME_SAMPLE], "25.000")
                            # ninth sample
                            self.assertEqual(csv_content[9][ROBOT_SRC_BARCODE], "Src1")
                            self.assertEqual(csv_content[9][ROBOT_SRC_COORD], "61")
                            self.assertEqual(csv_content[9][ROBOT_DST_BARCODE], "TubeDst")
                            self.assertEqual(csv_content[9][ROBOT_DST_COORD], "2")
                            self.assertEqual(csv_content[9][VOLUME_DILUENT], "0")
                            self.assertEqual(csv_content[9][VOLUME_SAMPLE], "40.000")
                            # tenth sample
                            self.assertEqual(csv_content[10][ROBOT_SRC_BARCODE], "Src1")
                            self.assertEqual(csv_content[10][ROBOT_SRC_COORD], "93")
                            self.assertEqual(csv_content[10][ROBOT_DST_BARCODE], "TubeDst")
                            self.assertEqual(csv_content[10][ROBOT_DST_COORD], "2")
                            self.assertEqual(csv_content[10][VOLUME_DILUENT], "0")
                            self.assertEqual(csv_content[10][VOLUME_SAMPLE], "100.000")
