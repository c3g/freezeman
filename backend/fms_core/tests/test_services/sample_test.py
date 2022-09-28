from django.test import TestCase
 
import datetime

from fms_core.models import SampleKind, Platform, Protocol, Taxon, LibraryType, Index, IndexStructure
from fms_core.models._constants import DOUBLE_STRANDED

from fms_core.services.sample import create_full_sample, pool_samples
from fms_core.services.container import create_container, get_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.library import create_library
from fms_core.services.process import create_process
from fms_core.services.index import get_or_create_index_set, create_indices_3prime_by_sequence, create_indices_5prime_by_sequence



class SampleServicesTestCase(TestCase):
    def setUp(self) -> None:
        TEST_CONTAINERS = [
            {"barcode": "BARCODECONTAINER1", "name":"CONTAINER1", "kind": "96-well plate", "location": "", "coordinates": ""},
            {"barcode": "BARCODECONTAINER2", "name":"CONTAINER2", "kind": "tube rack 8x12", "location": "", "coordinates": ""},
            {"barcode": "BARCODECONTAINER3", "name":"CONTAINER3", "kind": "tube", "location": "BARCODECONTAINER2", "coordinates": "A01"},
            {"barcode": "BARCODECONTAINER8", "name":"CONTAINER8", "kind": "tube", "location": "BARCODECONTAINER2", "coordinates": "A02"},
        ]

        self.test_containers = []
        for container in TEST_CONTAINERS:
            parent, _, _ = get_container(container["location"])
            new_container, _, _ = create_container(barcode=container["barcode"],
                                                           kind=container["kind"],
                                                           name=container["name"],
                                                           coordinates=container["coordinates"],
                                                           container_parent=parent)
            self.test_containers.append(new_container)

        TEST_INDIVIDUALS = [
            {"name": "Bob1", "alias": "WillJames", "sex": "M", "taxon": 9606, "pedigree": "Bob1", "cohort": "TEMP01"},
            {"name": "BobToo", "alias": "WillJello", "sex": "F", "taxon": 9606, "pedigree": "BobToo", "cohort": "TEMP01"},
        ]
        
        test_individuals = []
        for individual in TEST_INDIVIDUALS:
            new_individual, _, _ = get_or_create_individual(name=individual["name"],
                                                            alias=individual["alias"],
                                                            sex=individual["sex"],
                                                            taxon=Taxon.objects.get(ncbi_id=individual["taxon"]),
                                                            pedigree=individual["pedigree"],
                                                            cohort=individual["cohort"])
            test_individuals.append(new_individual)

        sample_kind_dna, _ = SampleKind.objects.get_or_create(name="DNA")
        platform_illumina, _ = Platform.objects.get_or_create(name="ILLUMINA")

        index_set, _, _, _ = get_or_create_index_set(set_name="Indexati")
        index_structure, _ = IndexStructure.objects.get_or_create(name="TruSeqHT")
        
        TEST_INDEX = [
            {"name": "index_1", "index_set": index_set, "index_structure": index_structure, "sequence_3_prime": "GACGCCTGAA", "sequence_5_prime": "AACTCCGGAT"},
            {"name": "index_2", "index_set": index_set, "index_structure": index_structure, "sequence_3_prime": "CGGATACTGA", "sequence_5_prime": "TCAATGGCCA"},
        ]

        test_indices = []
        for index in TEST_INDEX:
            new_index = Index.objects.create(name=index["name"], index_set=index["index_set"], index_structure=index["index_structure"])
            create_indices_3prime_by_sequence(new_index, [index["sequence_3_prime"]])
            create_indices_5prime_by_sequence(new_index, [index["sequence_5_prime"]])
            test_indices.append(new_index)


        TEST_LIBRARIES = [
            {"library_type": "WGBS", "index": test_indices[0], "platform": platform_illumina, "strandedness": DOUBLE_STRANDED, "library_size": 150},
            {"library_type": "PCR-free", "index": test_indices[1], "platform": platform_illumina, "strandedness": DOUBLE_STRANDED, "library_size": 150},
        ]

        test_libraries = []
        for library in TEST_LIBRARIES:
            new_library, _, _ = create_library(library_type=LibraryType.objects.get(name=library["library_type"]),
                                               index=library["index"],
                                               platform=library["platform"],
                                               strandedness=library["strandedness"],
                                               library_size=library["library_size"])
            test_libraries.append(new_library)

        # Create samples for testing
        SUBMITTED_SAMPLES = [
            {"name": "1FORPOOL1", "volume": 100, "concentration": 5, "collection_site": "TestSite", "creation_date": datetime.datetime(2021, 1, 15, 0, 0), "container": self.test_containers[0], "coordinates": "A01", "individual": test_individuals[0], "sample_kind": sample_kind_dna, "library": test_libraries[0], "project": "Testouille"},
            {"name": "2FORPOOL1", "volume": 200, "concentration": 6, "collection_site": "TestSite", "creation_date": datetime.datetime(2021, 1, 15, 0, 0), "container": self.test_containers[0], "coordinates": "A02", "individual": test_individuals[1], "sample_kind": sample_kind_dna, "library": test_libraries[1], "project": "Projecto"},
        ]

        self.samples = []
        for sample in SUBMITTED_SAMPLES:
            new_sample, _, _ = create_full_sample(name=sample["name"],
                                                  volume=sample["volume"],
                                                  concentration=sample["concentration"],
                                                  collection_site=sample["collection_site"],
                                                  creation_date=sample["creation_date"],
                                                  container=sample["container"],
                                                  coordinates=sample["coordinates"],
                                                  individual=sample["individual"],
                                                  sample_kind=sample["sample_kind"],
                                                  library=sample["library"])
        self.samples.append(new_sample)

    def test_pool_samples(self):
        POOL_NAME = "Patate"
        EXECUTION_DATE = datetime.datetime(2022, 9, 15, 0, 0)
        protocol, _ = Protocol.objects.get_or_create(name="Sample pooling")
        process, _, _ = create_process(protocol)

        samples_info = []
        for i, sample in enumerate(self.samples[:2]):
            sample_info = {
                "Source Sample": sample,
                "Source Container Barcode": sample.container.barcode,
                "Source Container Coordinate": sample.coordinates,
                "Source Depleted": False,
                "Volume Used (uL)": 20,
                "Comment": "Comment " + str(i),
            }
            samples_info.append(sample_info)

        pool, errors, warnings = pool_samples(process=process,
                                              samples_info=samples_info,
                                              pool_name=POOL_NAME,
                                              container_destination=self.test_containers[2],
                                              coordinates_destination="",
                                              execution_date=EXECUTION_DATE)

        self.assertFalse(errors)
        self.assertFalse(warnings)
        self.assertIsNotNone(pool)
        self.assertEqual(pool.name, POOL_NAME)