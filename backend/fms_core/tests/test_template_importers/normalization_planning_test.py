from django.test import TestCase
from datetime import datetime
from decimal import Decimal
import zipfile
from io import BytesIO

from fms_core.template_importer.importers import NormalizationPlanningImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT, TEST_DATA_ROOT

from fms_core.models._constants import DOUBLE_STRANDED
from fms_core.models import SampleKind

from fms_core.services.container import create_container, get_container
from fms_core.services.sample import create_full_sample
from fms_core.services.platform import get_platform
from fms_core.services.library import get_library_type, create_library
from fms_core.services.index import get_or_create_index_set, create_index, create_indices_3prime_by_sequence, create_indices_5prime_by_sequence


class NormalizationplanningTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = NormalizationPlanningImporter()
        self.files = [APP_DATA_ROOT / "Normalization_planning_v4_8_0_Library.xlsx",
                      APP_DATA_ROOT / "Normalization_planning_v4_8_0_Sample_Tube.xlsx",
                      APP_DATA_ROOT / "Normalization_planning_v4_8_0_Sample_Plate.xlsx",
                      APP_DATA_ROOT / "Normalization_planning_v4_8_0_Genotyping_Tube.xlsx",
                     ]

        self.invalid_template_tests = [TEST_DATA_ROOT / "Normalization_planning_v4_8_0_Concentration_Too_Low.xlsx",
                                       TEST_DATA_ROOT / "Normalization_planning_v4_8_0_Missing_Input.xlsx",
                                       TEST_DATA_ROOT / "Normalization_planning_v4_8_0_Manual_Diluent.xlsx",
                                      ]

        self.INDICES = [{"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_001-IDT_10nt_UDI_i5_001", "sequence_3_prime": ["ACAAAGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_002-IDT_10nt_UDI_i5_002", "sequence_3_prime": ["ACTTTGTC"], "sequence_5_prime": ["CAGGTGTC"]},
                        {"index_set": "IDT_10nt_UDI_TruSeq_Adapter", "index_structure": "TruSeqHT", "index_name": "IDT_10nt_UDI_i7_003-IDT_10nt_UDI_i5_003", "sequence_3_prime": ["ACAATGTC"], "sequence_5_prime": ["CAGGTGTC"]},]

        self.DNA_sample_kind, _ = SampleKind.objects.get_or_create(name='DNA')
        self.plate_source_name_and_barcode = "NormSourcePlate1"
        self.source_sample_initial_volume = 100

        self.prefill_data()


    def prefill_data(self):
        platform_illumina, _, _ = get_platform(name="ILLUMINA")
        library_type, _, _ = get_library_type(name="PCR-free")

        # Create indices
        indices = {}
        for i, index in enumerate(self.INDICES):
            (index_set, _, _, _) = get_or_create_index_set(set_name=index["index_set"])
            (indices[i], _, _) = create_index(index_set=index_set, index_structure=index["index_structure"],
                                              index_name=index["index_name"])
            create_indices_3prime_by_sequence(indices[i], index["sequence_3_prime"])
            create_indices_5prime_by_sequence(indices[i], index["sequence_5_prime"])

        libraries = [None] * 3
        for i, _ in enumerate(libraries):
            libraries[i], _, _ = create_library(index=indices[i],
                                                library_type=library_type,
                                                platform=platform_illumina,
                                                strandedness=DOUBLE_STRANDED)

        containers_info = [
            {'barcode': 'PARENT_RACK_NORM', 'name': 'PARENT_RACK_NORM', 'kind': 'tube rack 8x12', 'location': None, 'coordinates': None,},
            {'barcode': 'SRC_PLATE_NORM', 'name': 'SRC_PLATE_NORM', 'kind': '96-well plate', 'location': None, 'coordinates': None,},
            {'barcode': 'DST_PLATE_NORM_1', 'name': 'DST_PLATE_NORM_1', 'kind': '96-well plate', 'location': None, 'coordinates': None,},
            {'barcode': 'DST_PLATE_NORM_2', 'name': 'DST_PLATE_NORM_2', 'kind': '96-well plate', 'location': None, 'coordinates': None,},
            {'barcode': 'SRC_TUBE_NORM_1', 'name': 'SRC_TUBE_NORM_1', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'E01',},
            {'barcode': 'SRC_TUBE_NORM_2', 'name': 'SRC_TUBE_NORM_2', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'F01',},
            {'barcode': 'SRC_TUBE_NORM_3', 'name': 'SRC_TUBE_NORM_3', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'G01',},
            {'barcode': 'SRC_TUBE_NORM_4', 'name': 'SRC_TUBE_NORM_4', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'E02',},
            {'barcode': 'SRC_TUBE_NORM_5', 'name': 'SRC_TUBE_NORM_5', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'F02',},
            {'barcode': 'SRC_TUBE_NORM_6', 'name': 'SRC_TUBE_NORM_6', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'G02',},
        ]

        samples_info = [
            {'name': 'Sample1NormPlanning', 'volume': 100, 'conc.': 25, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'B01', 'library': None, 'fragment_size': None},
            {'name': 'Sample2NormPlanning', 'volume': 100, 'conc.': 50, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'B02', 'library': None, 'fragment_size': None},
            {'name': 'Sample3NormPlanning', 'volume': 100, 'conc.': 10, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'C01', 'library': None, 'fragment_size': None},
            {'name': 'Sample4NormPlanning', 'volume': 100, 'conc.': 60, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A01', 'library': libraries[0], 'fragment_size': 150},
            {'name': 'Sample5NormPlanning', 'volume': 100, 'conc.': 40, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A02', 'library': libraries[1], 'fragment_size': 150},
            {'name': 'Sample6NormPlanning', 'volume': 100, 'conc.': 80, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A03', 'library': libraries[2], 'fragment_size': 150},
            {'name': 'Sample7NormPlanning', 'volume': 100, 'conc.': 25, 'container_barcode': 'SRC_TUBE_NORM_1', 'coordinates': None, 'library': None, 'fragment_size': None},
            {'name': 'Sample8NormPlanning', 'volume': 100, 'conc.': 50, 'container_barcode': 'SRC_TUBE_NORM_2', 'coordinates': None, 'library': None, 'fragment_size': None},
            {'name': 'Sample9NormPlanning', 'volume': 100, 'conc.': 10, 'container_barcode': 'SRC_TUBE_NORM_3', 'coordinates': None, 'library': None, 'fragment_size': None},
            {'name': 'Sample10NormPlanning', 'volume': 100, 'conc.': 25, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'D01', 'library': None, 'fragment_size': None},
            {'name': 'Sample11NormPlanning', 'volume': 100, 'conc.': 50, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'D02', 'library': None, 'fragment_size': None},
            {'name': 'Sample12NormPlanning', 'volume': 100, 'conc.': 10, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'D03', 'library': None, 'fragment_size': None},
            {'name': 'Sample13NormPlanning', 'volume': 100, 'conc.': 20, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'D04', 'library': None, 'fragment_size': None},
            {'name': 'Sample14NormPlanning', 'volume': 100, 'conc.': 25, 'container_barcode': 'SRC_TUBE_NORM_4', 'coordinates': None, 'library': None, 'fragment_size': None},
            {'name': 'Sample15NormPlanning', 'volume': 100, 'conc.': 50, 'container_barcode': 'SRC_TUBE_NORM_5', 'coordinates': None, 'library': None, 'fragment_size': None},
            {'name': 'Sample16NormPlanning', 'volume': 100, 'conc.': 10, 'container_barcode': 'SRC_TUBE_NORM_6', 'coordinates': None, 'library': None, 'fragment_size': None},
            {'name': 'Sample17NormPlanning', 'volume': 100, 'conc.': 20, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'E01', 'library': None, 'fragment_size': None},
            {'name': 'Sample18NormPlanning', 'volume': 100, 'conc.': 20, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'E02', 'library': None, 'fragment_size': None},
        ]

        for info in containers_info:
            location, _, _ = get_container(barcode=info['location']) if info['location'] is not None else (None, [], [])
            create_container(barcode=info['barcode'], name=info['name'], kind=info['kind'], container_parent=location, coordinates=info['coordinates'])

        for info in samples_info:
            container, _, _ = get_container(barcode=info['container_barcode'])

            sample, _, _ = create_full_sample(name=info['name'],
                                              volume=info['volume'],
                                              concentration=info['conc.'],
                                              collection_site='site1',
                                              creation_date=datetime(2022, 7, 5, 0, 0),
                                              container=container,
                                              coordinates=info['coordinates'],
                                              sample_kind=self.DNA_sample_kind,
                                              library=info['library'],
                                              fragment_size=info['fragment_size'])

    def test_import(self):
        for file in self.files:
            # Basic test for all templates - checks that template is valid
            result = load_template(importer=self.importer, file=file)
            self.assertEqual(result['valid'], True)

            if result['valid']:
                content_zipped = zipfile.ZipFile(BytesIO(result['output_file']['content']))
                for filename in content_zipped.namelist():
                    if filename[-5:] != ".xlsx":  # At the moment we only test the csv output files.
                        csv_content = {}
                        with content_zipped.open(filename) as zfile:   
                            for i, line in enumerate(zfile):
                                csv_content[i] = line.decode().strip().split(",") # Extract file into dictionary

                        if filename.find("Normalization_library_diluent_") != -1:
                            # 0: robot_dst_barcode
                            # 1: robot_dst_coord
                            # 2: volume_diluent

                            # First library
                            self.assertEqual(csv_content[1][0], "Dil1")
                            self.assertEqual(csv_content[1][1], "1")
                            self.assertEqual(csv_content[1][2], "11.382")
                            # Second library
                            self.assertEqual(csv_content[2][0], "Dil1")
                            self.assertEqual(csv_content[2][1], "2")
                            self.assertEqual(csv_content[2][2], "42.072")
                            # Third library
                            self.assertEqual(csv_content[3][0], "Dil1")
                            self.assertEqual(csv_content[3][1], "3")
                            self.assertEqual(csv_content[3][2], "21.036")

                        elif filename.find("Normalization_library_main_dilution_") != -1:
                            # 0: container_src_barcode
                            # 1: robot_src_barcode
                            # 2: robot_src_coord
                            # 3: robot_dst_barcode
                            # 4: robot_dst_coord
                            # 5: volume_library

                            # First library
                            self.assertEqual(csv_content[1][0], "SRC_PLATE_NORM")
                            self.assertEqual(csv_content[1][1], "Source1")
                            self.assertEqual(csv_content[1][2], "1")
                            self.assertEqual(csv_content[1][3], "Dil1")
                            self.assertEqual(csv_content[1][4], "1")
                            self.assertEqual(csv_content[1][5], "38.618")
                            # Second library
                            self.assertEqual(csv_content[2][0], "SRC_PLATE_NORM")
                            self.assertEqual(csv_content[2][1], "Source1")
                            self.assertEqual(csv_content[2][2], "9")
                            self.assertEqual(csv_content[2][3], "Dil1")
                            self.assertEqual(csv_content[2][4], "2")
                            self.assertEqual(csv_content[2][5], "57.928")
                            # Third library
                            self.assertEqual(csv_content[3][0], "SRC_PLATE_NORM")
                            self.assertEqual(csv_content[3][1], "Source1")
                            self.assertEqual(csv_content[3][2], "17")
                            self.assertEqual(csv_content[3][3], "Dil1")
                            self.assertEqual(csv_content[3][4], "3")
                            self.assertEqual(csv_content[3][5], "28.964")

                        elif filename.find("Normalization_sample_Janus") != -1:
                            # 0: robot_src_barcode
                            # 1: robot_src_coord
                            # 2: robot_dst_barcode
                            # 3: robot_dst_coord
                            # 4: volume_diluent
                            # 5: volume_sample

                            # First sample
                            self.assertEqual(csv_content[1][0], "Src1")
                            self.assertEqual(csv_content[1][1], "2")
                            self.assertEqual(csv_content[1][2], "Dst1")
                            self.assertEqual(csv_content[1][3], "9")
                            self.assertEqual(csv_content[1][4], "26.000")
                            self.assertEqual(csv_content[1][5], "4.000")
                            # Second sample
                            self.assertEqual(csv_content[2][0], "Src1")
                            self.assertEqual(csv_content[2][1], "10")
                            self.assertEqual(csv_content[2][2], "Dst1")
                            self.assertEqual(csv_content[2][3], "10")
                            self.assertEqual(csv_content[2][4], "20.000")
                            self.assertEqual(csv_content[2][5], "30.000")
                            # Third sample
                            self.assertEqual(csv_content[3][0], "Src1")
                            self.assertEqual(csv_content[3][1], "3")
                            self.assertEqual(csv_content[3][2], "Dst1")
                            self.assertEqual(csv_content[3][3], "11")
                            self.assertEqual(csv_content[3][4], "0.000")
                            self.assertEqual(csv_content[3][5], "20.000")
                            # Fourth sample
                            self.assertEqual(csv_content[4][0], "Src1")
                            self.assertEqual(csv_content[4][1], "5")
                            self.assertEqual(csv_content[4][2], "Dst2")
                            self.assertEqual(csv_content[4][3], "5")
                            self.assertEqual(csv_content[4][4], "2.000")
                            self.assertEqual(csv_content[4][5], "10.000")
                            # Fifth sample
                            self.assertEqual(csv_content[5][0], "Src1")
                            self.assertEqual(csv_content[5][1], "4")
                            self.assertEqual(csv_content[5][2], "Dst2")
                            self.assertEqual(csv_content[5][3], "9")
                            self.assertEqual(csv_content[5][4], "0.000")
                            self.assertEqual(csv_content[5][5], "100.000")
                            # Sixth sample
                            self.assertEqual(csv_content[6][0], "Src1")
                            self.assertEqual(csv_content[6][1], "12")
                            self.assertEqual(csv_content[6][2], "Dst2")
                            self.assertEqual(csv_content[6][3], "10")
                            self.assertEqual(csv_content[6][4], "20.000")
                            self.assertEqual(csv_content[6][5], "30.000")
                            # Seventh sample
                            self.assertEqual(csv_content[7][0], "Src1")
                            self.assertEqual(csv_content[7][1], "20")
                            self.assertEqual(csv_content[7][2], "Dst2")
                            self.assertEqual(csv_content[7][3], "11")
                            self.assertEqual(csv_content[7][4], "0.000")
                            self.assertEqual(csv_content[7][5], "20.000")
                            # Eighth sample
                            self.assertEqual(csv_content[8][0], "Src1")
                            self.assertEqual(csv_content[8][1], "28")
                            self.assertEqual(csv_content[8][2], "Dst2")
                            self.assertEqual(csv_content[8][3], "12")
                            self.assertEqual(csv_content[8][4], "10.000")
                            self.assertEqual(csv_content[8][5], "100.000")
                            # ninth sample
                            self.assertEqual(csv_content[9][0], "Src1")
                            self.assertEqual(csv_content[9][1], "13")
                            self.assertEqual(csv_content[9][2], "Dst2")
                            self.assertEqual(csv_content[9][3], "13")
                            self.assertEqual(csv_content[9][4], "0.000")
                            self.assertEqual(csv_content[9][5], "8.000")

                        elif filename.find("Normalization_sample_Biomek") != -1:
                            # 0: robot_src_barcode
                            # 1: src_coord
                            # 2: robot_dst_barcode
                            # 3: dst_coord
                            # 4: Volume_Sample
                            # 5: Diluant_Bath = "Water"
                            # 6: Diluant_Well = "4"
                            # 7: Volume_Diluant

                            # First sample
                            self.assertEqual(csv_content[1][0], "Src1")
                            self.assertEqual(csv_content[1][1], "E01")
                            self.assertEqual(csv_content[1][2], "Dst1")
                            self.assertEqual(csv_content[1][3], "A03")
                            self.assertEqual(csv_content[1][4], "0.200")
                            self.assertEqual(csv_content[1][5], "Water")
                            self.assertEqual(csv_content[1][6], "4")
                            self.assertEqual(csv_content[1][7], "99.800")
                            # Second sample
                            self.assertEqual(csv_content[2][0], "Src1")
                            self.assertEqual(csv_content[2][1], "F01")
                            self.assertEqual(csv_content[2][2], "Dst1")
                            self.assertEqual(csv_content[2][3], "B03")
                            self.assertEqual(csv_content[2][4], "0.800")
                            self.assertEqual(csv_content[2][5], "Water")
                            self.assertEqual(csv_content[2][6], "4")
                            self.assertEqual(csv_content[2][7], "99.200")
                            # Third sample
                            self.assertEqual(csv_content[3][0], "Src1")
                            self.assertEqual(csv_content[3][1], "G01")
                            self.assertEqual(csv_content[3][2], "Dst1")
                            self.assertEqual(csv_content[3][3], "C03")
                            self.assertEqual(csv_content[3][4], "1.000")
                            self.assertEqual(csv_content[3][5], "Water")
                            self.assertEqual(csv_content[3][6], "4")                            
                            self.assertEqual(csv_content[3][7], "99.000")

                        elif filename.find("Normalization_genotyping_Biomek") != -1:
                            # 0: robot_src_barcode
                            # 1: src_coord
                            # 2: robot_dst_barcode
                            # 3: dst_coord
                            # 4: Volume_Sample
                            # 5: Diluant_Bath = "Water"
                            # 6: Diluant_Well = "4"
                            # 7: Volume_Diluant

                            # First sample
                            self.assertEqual(csv_content[1][0], "Src1")
                            self.assertEqual(csv_content[1][1], "E02")
                            self.assertEqual(csv_content[1][2], "Dst1")
                            self.assertEqual(csv_content[1][3], "A04")
                            self.assertEqual(csv_content[1][4], "0.200")
                            self.assertEqual(csv_content[1][5], "Water")
                            self.assertEqual(csv_content[1][6], "4")
                            self.assertEqual(csv_content[1][7], "99.800")
                            # Second sample
                            self.assertEqual(csv_content[2][0], "Src1")
                            self.assertEqual(csv_content[2][1], "G02")
                            self.assertEqual(csv_content[2][2], "Dst1")
                            self.assertEqual(csv_content[2][3], "C04")
                            self.assertEqual(csv_content[2][4], "1.000")
                            self.assertEqual(csv_content[2][5], "Water")
                            self.assertEqual(csv_content[2][6], "4")                            
                            self.assertEqual(csv_content[2][7], "99.000")
                            # There should not be a third sample 
                            self.assertEqual(len(csv_content), 3) # 1 header + 2 samples

    def test_insufficient_concentration_normalization_planning(self):
        self.container_1, _, _ = create_container(barcode=self.plate_source_name_and_barcode,
                                                  kind='96-well plate',
                                                  name=self.plate_source_name_and_barcode)

        self.source_sample_1, _, _ = \
            create_full_sample(name="SOURCESAMPLENORM1", alias="SOURCESAMPLENORM1", volume=self.source_sample_initial_volume, concentration=5,
                               collection_site="Site1", creation_date=datetime(2023, 9, 25, 0, 0), container=self.container_1, coordinates="A01",
                               sample_kind=self.DNA_sample_kind)
                    
        result = {}
        result = load_template(importer=self.importer, file=self.invalid_template_tests[0])
        self.assertEqual(result['valid'], False)
        self.assertEqual(result["result_previews"][0]["rows"][0]["validation_error"].error_dict["concentration"][0].messages[0], "Requested concentration is higher than the source sample concentration. This cannot be achieved by dilution. Use bypass if you want to submit using this final volume value.")

    def test_insufficient_material_normalization_planning(self):
        self.container_2, _, _ = create_container(barcode=self.plate_source_name_and_barcode,
                                                  kind='96-well plate',
                                                  name=self.plate_source_name_and_barcode)

        self.source_sample_2, _, _ = \
            create_full_sample(name="SOURCESAMPLENORM2", alias="SOURCESAMPLENORM2", volume=self.source_sample_initial_volume, concentration=25,
                               collection_site="Site2", creation_date=datetime(2023, 9, 25, 0, 0), container=self.container_2, coordinates="A02",
                               sample_kind=self.DNA_sample_kind)
        
        result = {}
        result = load_template(importer=self.importer, file=self.invalid_template_tests[1])
        self.assertEqual(result['valid'], False)
        self.assertEqual(result["result_previews"][0]["rows"][0]["validation_error"].error_dict["concentration"][0].messages[0], "Insufficient available NA material to comply. Use bypass if you want to submit using this final volume value.")

    def test_insufficient_concentration_manual_diluent_normalization_planning(self):
        self.container_3, _, _ = create_container(barcode=self.plate_source_name_and_barcode,
                                                  kind='96-well plate',
                                                  name=self.plate_source_name_and_barcode)

        self.source_sample_3, _, _ = \
            create_full_sample(name="SOURCESAMPLENORM3", alias="SOURCESAMPLENORM3", volume=20, concentration=10,
                               collection_site="Site2", creation_date=datetime(2023, 9, 25, 0, 0), container=self.container_3, coordinates="A02",
                               sample_kind=self.DNA_sample_kind)
        
        result = {}
        result = load_template(importer=self.importer, file=self.invalid_template_tests[2])
        self.assertEqual(result['valid'], False)
        self.assertEqual(result["result_previews"][0]["rows"][0]["validation_error"].error_dict["manual_diluent"][0].messages[0], "Volume of manual diluent required to comply cannot be supplied given the sample concentration. Use bypass if you want to submit and reduce the requested concentration.")