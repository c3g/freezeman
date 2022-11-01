from django.test import TestCase
from datetime import datetime
from decimal import Decimal
import zipfile
from io import BytesIO

from fms_core.template_importer.importers import NormalizationPlanningImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT

from fms_core.models._constants import DOUBLE_STRANDED, DSDNA_MW

from fms_core.models import Sample, SampleKind, ProcessMeasurement, SampleLineage, PropertyType, PropertyValue

from fms_core.services.container import get_or_create_container, create_container, get_container
from fms_core.services.sample import create_full_sample
from fms_core.services.platform import get_platform
from fms_core.services.library import get_library_type, create_library
from fms_core.services.index import get_or_create_index_set, create_index

from fms_core.utils import convert_concentration_from_nm_to_ngbyul

class NormalizationplanningTestCase(TestCase):
    def setUp(self) -> None:
        self.importer = NormalizationPlanningImporter()
        self.files = [APP_DATA_ROOT / "Normalization_planning_v3_13_0_Library.xlsx",
                      APP_DATA_ROOT / "Normalization_planning_v3_13_0_Sample_Tube.xlsx",
                      APP_DATA_ROOT / "Normalization_planning_v3_13_0_Sample_Plate.xlsx"]

        self.prefill_data()


    def prefill_data(self):
        sample_kind_DNA, _ = SampleKind.objects.get_or_create(name='DNA')

        platform_illumina, _, _ = get_platform(name="ILLUMINA")
        library_type, _, _ = get_library_type(name="PCR-free")

        # Create indices
        (index_set, _, _, _) = get_or_create_index_set(set_name="IDT_10nt_UDI_TruSeq_Adapter")
        (index_1, _, _) = create_index(index_set=index_set, index_structure="TruSeqHT",
                                                      index_name="IDT_10nt_UDI_i7_001-IDT_10nt_UDI_i5_001")
        libraries = [None] * 3
        for i, _ in enumerate(libraries):
            libraries[i], _, _ = create_library(index=index_1,
                                                library_type=library_type,
                                                platform=platform_illumina,
                                                strandedness=DOUBLE_STRANDED,
                                                library_size=150)

        containers_info = [
            {'barcode': 'PARENT_RACK_NORM', 'name': 'PARENT_RACK_NORM', 'kind': 'tube rack 8x12', 'location': None, 'coordinates': '',},
            {'barcode': 'SRC_PLATE_NORM', 'name': 'SRC_PLATE_NORM', 'kind': '96-well plate', 'location': None, 'coordinates': '',},
            {'barcode': 'DST_PLATE_NORM_1', 'name': 'DST_PLATE_NORM_1', 'kind': '96-well plate', 'location': None, 'coordinates': '',},
            {'barcode': 'DST_PLATE_NORM_2', 'name': 'DST_PLATE_NORM_2', 'kind': '96-well plate', 'location': None, 'coordinates': '',},
            {'barcode': 'SRC_TUBE_NORM_1', 'name': 'SRC_TUBE_NORM_1', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'E01',},
            {'barcode': 'SRC_TUBE_NORM_2', 'name': 'SRC_TUBE_NORM_2', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'F01',},
            {'barcode': 'SRC_TUBE_NORM_3', 'name': 'SRC_TUBE_NORM_3', 'kind': 'tube', 'location': 'PARENT_RACK_NORM', 'coordinates': 'G01',},
        ]

        samples_info = [
            {'name': 'Sample1NormPlanning', 'volume': 100, 'conc.': 25, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'B01', 'library': None},
            {'name': 'Sample2NormPlanning', 'volume': 100, 'conc.': 50, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'B02', 'library': None},
            {'name': 'Sample3NormPlanning', 'volume': 100, 'conc.': 10, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'C01', 'library': None},
            {'name': 'Sample4NormPlanning', 'volume': 100, 'conc.': 60, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A01', 'library': libraries[0]},
            {'name': 'Sample5NormPlanning', 'volume': 100, 'conc.': 40, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A02', 'library': libraries[1]},
            {'name': 'Sample6NormPlanning', 'volume': 100, 'conc.': 80, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'A03', 'library': libraries[2]},
            {'name': 'Sample7NormPlanning', 'volume': 100, 'conc.': 25, 'container_barcode': 'SRC_TUBE_NORM_1', 'coordinates': '', 'library': None},
            {'name': 'Sample8NormPlanning', 'volume': 100, 'conc.': 50, 'container_barcode': 'SRC_TUBE_NORM_2', 'coordinates': '', 'library': None},
            {'name': 'Sample9NormPlanning', 'volume': 100, 'conc.': 10, 'container_barcode': 'SRC_TUBE_NORM_3', 'coordinates': '', 'library': None},
            {'name': 'Sample10NormPlanning', 'volume': 100, 'conc.': 25, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'D01', 'library': None},
            {'name': 'Sample11NormPlanning', 'volume': 100, 'conc.': 50, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'D02', 'library': None},
            {'name': 'Sample12NormPlanning', 'volume': 100, 'conc.': 10, 'container_barcode': 'SRC_PLATE_NORM', 'coordinates': 'D03', 'library': None},
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
                               sample_kind=sample_kind_DNA,
                               library=info['library'])

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

                        if filename.find("Normalization_libraries_diluent_") != -1:
                            # 0: robot_dst_barcode
                            # 1: robot_dst_coord
                            # 2: volume_diluent

                            # First library
                            self.assertEqual(csv_content[1][0], "Dil1")
                            self.assertEqual(csv_content[1][1], "1")
                            self.assertEqual(csv_content[1][2], "11.381")
                            # Second library
                            self.assertEqual(csv_content[2][0], "Dil1")
                            self.assertEqual(csv_content[2][1], "2")
                            self.assertEqual(csv_content[2][2], "42.072")
                            # Third library
                            self.assertEqual(csv_content[3][0], "Dil1")
                            self.assertEqual(csv_content[3][1], "3")
                            self.assertEqual(csv_content[3][2], "21.036")
                                
                        elif filename.find("Normalization_libraries_main_dilution_") != -1:
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
                            self.assertEqual(csv_content[1][5], "38.619")
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

                        elif filename.find("Normalization_samples_Janus") != -1:
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
                            self.assertEqual(csv_content[4][1], "4")
                            self.assertEqual(csv_content[4][2], "Dst2")
                            self.assertEqual(csv_content[4][3], "9")
                            self.assertEqual(csv_content[4][4], "26.000")
                            self.assertEqual(csv_content[4][5], "4.000")
                            # Fifth sample
                            self.assertEqual(csv_content[5][0], "Src1")
                            self.assertEqual(csv_content[5][1], "12")
                            self.assertEqual(csv_content[5][2], "Dst2")
                            self.assertEqual(csv_content[5][3], "10")
                            self.assertEqual(csv_content[5][4], "20.000")
                            self.assertEqual(csv_content[5][5], "30.000")
                            # Sixth sample
                            self.assertEqual(csv_content[6][0], "Src1")
                            self.assertEqual(csv_content[6][1], "20")
                            self.assertEqual(csv_content[6][2], "Dst2")
                            self.assertEqual(csv_content[6][3], "11")
                            self.assertEqual(csv_content[6][4], "0.000")
                            self.assertEqual(csv_content[6][5], "20.000")

                        elif filename.find("Normalization_samples_Janus") != -1:
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
                            self.assertEqual(csv_content[1][3], "C01")
                            self.assertEqual(csv_content[1][4], "0.200")
                            self.assertEqual(csv_content[1][5], "Water")
                            self.assertEqual(csv_content[1][6], "4")
                            self.assertEqual(csv_content[1][7], "99.800")
                            # Second sample
                            self.assertEqual(csv_content[2][0], "Src1")
                            self.assertEqual(csv_content[2][1], "F01")
                            self.assertEqual(csv_content[2][2], "Dst1")
                            self.assertEqual(csv_content[2][3], "C02")
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