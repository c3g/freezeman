from curses import meta
from typing import Any
from django.test import TestCase
 
import datetime
from decimal import Decimal

from fms_core.models import (SampleKind, Platform, Protocol, Taxon, LibraryType, Index, IndexStructure, IndexBySet,
                             Project, DerivedSample, DerivedBySample, ProcessMeasurement, SampleLineage,
                             SampleMetadata, Coordinate)
from fms_core.models._constants import DOUBLE_STRANDED, SINGLE_STRANDED

from fms_core.services.sample import (create_full_sample, get_sample_from_container, update_sample,
                                      inherit_sample, transfer_sample, extract_sample, pool_samples,
                                      prepare_library, _process_sample, update_qc_flags, remove_qc_flags,
                                      add_sample_metadata, update_sample_metadata, remove_sample_metadata,
                                      validate_normalization, pool_submitted_samples, test_and_update_volume_ratio)
from fms_core.services.derived_sample import inherit_derived_sample
from fms_core.services.container import create_container, get_container
from fms_core.services.individual import get_or_create_individual
from fms_core.services.library import create_library
from fms_core.services.project import create_project
from fms_core.services.process import create_process
from fms_core.services.index import get_or_create_index_set, create_indices_3prime_by_sequence, create_indices_5prime_by_sequence



class SampleServicesTestCase(TestCase):
    def setUp(self) -> None:

        self.coord_A04 = Coordinate.objects.get(name="A04")
        self.coord_B02 = Coordinate.objects.get(name="B02")

        TEST_CONTAINERS = [
            {"barcode": "BARCODECONTAINER1", "name":"CONTAINER1", "kind": "96-well plate", "location": "", "coordinates": None},
            {"barcode": "BARCODECONTAINER2", "name":"CONTAINER2", "kind": "tube rack 8x12", "location": "", "coordinates": None},
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
        
        self.test_individuals = []
        for individual in TEST_INDIVIDUALS:
            new_individual, _, _, _ = get_or_create_individual(name=individual["name"],
                                                               alias=individual["alias"],
                                                               sex=individual["sex"],
                                                               taxon=Taxon.objects.get(ncbi_id=individual["taxon"]),
                                                               pedigree=individual["pedigree"],
                                                               cohort=individual["cohort"])
            self.test_individuals.append(new_individual)

        self.sample_kind_dna, _ = SampleKind.objects.get_or_create(name="DNA")
        self.sample_kind_blood, _ = SampleKind.objects.get_or_create(name="BLOOD")
        platform_illumina, _ = Platform.objects.get_or_create(name="ILLUMINA")
        platform_dnbseq, _ = Platform.objects.get_or_create(name="DNBSEQ")

        index_set, _, _, _ = get_or_create_index_set(set_name="Indexati")
        index_structure, _ = IndexStructure.objects.get_or_create(name="TruSeqHT")
        
        TEST_INDEX = [
            {"name": "index_1", "index_set": index_set, "index_structure": index_structure, "sequence_3_prime": "GACGCCTGAA", "sequence_5_prime": "AACTCCGGAT"},
            {"name": "index_2", "index_set": index_set, "index_structure": index_structure, "sequence_3_prime": "CGGATACTGA", "sequence_5_prime": "TCAATGGCCA"},
        ]

        test_indices = []
        for index in TEST_INDEX:
            new_index = Index.objects.create(name=index["name"], index_structure=index["index_structure"])
            IndexBySet.objects.create(index=new_index, index_set=index["index_set"])
            create_indices_3prime_by_sequence(new_index, [index["sequence_3_prime"]])
            create_indices_5prime_by_sequence(new_index, [index["sequence_5_prime"]])
            test_indices.append(new_index)


        TEST_LIBRARIES = [
            {"library_type": "WGBS", "index": test_indices[0], "platform": platform_illumina, "strandedness": DOUBLE_STRANDED},
            {"library_type": "PCR-free", "index": test_indices[1], "platform": platform_illumina, "strandedness": DOUBLE_STRANDED},
            {"library_type": "PCR-enriched", "index": test_indices[1], "platform": platform_dnbseq, "strandedness": SINGLE_STRANDED},
            {"library_type": "PCR-enriched", "index": test_indices[1], "platform": platform_illumina, "strandedness": DOUBLE_STRANDED},
            {"library_type": "PCR-free", "index": test_indices[0], "platform": platform_illumina, "strandedness": SINGLE_STRANDED},
            {"library_type": "PCR-free", "index": test_indices[1], "platform": platform_illumina, "strandedness": SINGLE_STRANDED},
        ]

        self.test_libraries = []
        for library in TEST_LIBRARIES:
            new_library, _, _ = create_library(library_type=LibraryType.objects.get(name=library["library_type"]),
                                               index=library["index"],
                                               platform=library["platform"],
                                               strandedness=library["strandedness"])
            self.test_libraries.append(new_library)

        self.project_testouille, _, _ = create_project(name="Testouille")
        self.project_projecto, _, _ = create_project(name="Projecto")

        # Create samples for testing
        SUBMITTED_SAMPLES = [
            {"name": "1FORPOOL1", "volume": 100, "concentration": 5, "collection_site": "TestSite", "creation_date": datetime.datetime(2021, 1, 10, 0, 0), "container": self.test_containers[0], "coordinates": "A01", "individual": self.test_individuals[0], "sample_kind": self.sample_kind_dna, "library": self.test_libraries[0], "project": self.project_testouille, "fragment_size": 150},
            {"name": "2FORPOOL1", "volume": 200, "concentration": 6, "collection_site": "TestSite", "creation_date": datetime.datetime(2021, 1, 15, 0, 0), "container": self.test_containers[0], "coordinates": "A02", "individual": self.test_individuals[1], "sample_kind": self.sample_kind_dna, "library": self.test_libraries[1], "project": self.project_projecto, "fragment_size": 150},
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
                                                  library=sample["library"],
                                                  project=sample["project"],
                                                  fragment_size=sample["fragment_size"])
            self.samples.append(new_sample)
        
        # Create samples for testing
        self.TEST_SAMPLES = [
            {"name": "TESTCREATEFULLSAMPLE", "volume": 1000, "concentration": 2, "collection_site": "TestSite", "creation_date": datetime.date(2021, 1, 10), "container": self.test_containers[0], "coordinates": "A03", "individual": self.test_individuals[0], "sample_kind": self.sample_kind_dna, "library": self.test_libraries[2], "project": self.project_testouille, "fragment_size": 100},
            {"name": "TESTEXTRACTSAMPLE", "volume": 1000, "concentration": None, "collection_site": "TestSite", "creation_date": datetime.date(2021, 1, 10), "container": self.test_containers[0], "coordinates": "A08", "individual": self.test_individuals[0], "sample_kind": self.sample_kind_blood, "library": None, "project": self.project_testouille},
            {"name": "TESTPREPARELIBRARYSAMPLE", "volume": 1000, "concentration": None, "collection_site": "TestSite", "creation_date": datetime.date(2021, 1, 10), "container": self.test_containers[0], "coordinates": "A10", "individual": self.test_individuals[0], "sample_kind": self.sample_kind_dna, "library": None, "project": self.project_testouille},
        ]

        # Create samples for testing
        self.SUBMITTED_SAMPLES_TO_POOL = [
            {"alias": "Alias1", "individual": self.test_individuals[0], "collection_site": "TestSite", "sample_kind": self.sample_kind_dna, "tissue_source": self.sample_kind_blood, "library": self.test_libraries[4], "project": None, "studies": [], "volume_ratio": Decimal(0.25), "experimental_group": None, "fragment_size": 100},
            {"alias": "Alias2", "individual": self.test_individuals[1], "collection_site": "TestSite", "sample_kind": self.sample_kind_dna, "tissue_source": self.sample_kind_blood, "library": self.test_libraries[5], "project": None, "studies": [], "volume_ratio": Decimal(0.75), "experimental_group": None, "fragment_size": 100},
        ]
        self.SUBMITTED_SAMPLES_TO_POOL_VOLUME = Decimal(40)

    def test_create_full_sample(self):
        new_sample, errors, warnings = create_full_sample(name=self.TEST_SAMPLES[0]["name"],
                                                          volume=self.TEST_SAMPLES[0]["volume"],
                                                          concentration=self.TEST_SAMPLES[0]["concentration"],
                                                          collection_site=self.TEST_SAMPLES[0]["collection_site"],
                                                          creation_date=self.TEST_SAMPLES[0]["creation_date"],
                                                          container=self.TEST_SAMPLES[0]["container"],
                                                          coordinates=self.TEST_SAMPLES[0]["coordinates"],
                                                          individual=self.TEST_SAMPLES[0]["individual"],
                                                          sample_kind=self.TEST_SAMPLES[0]["sample_kind"],
                                                          library=self.TEST_SAMPLES[0]["library"],
                                                          project=self.TEST_SAMPLES[0]["project"],
                                                          fragment_size=self.TEST_SAMPLES[0]["fragment_size"])
        self.assertEqual(new_sample.name, self.TEST_SAMPLES[0]["name"])
        self.assertEqual(new_sample.volume, self.TEST_SAMPLES[0]["volume"])
        self.assertEqual(new_sample.concentration, self.TEST_SAMPLES[0]["concentration"])
        self.assertEqual(new_sample.derived_samples.first().biosample.collection_site, self.TEST_SAMPLES[0]["collection_site"])
        self.assertEqual(new_sample.creation_date, self.TEST_SAMPLES[0]["creation_date"])
        self.assertEqual(new_sample.container, self.TEST_SAMPLES[0]["container"])
        self.assertEqual(new_sample.coordinates, self.TEST_SAMPLES[0]["coordinates"])
        self.assertEqual(new_sample.derived_samples.first().biosample.individual, self.TEST_SAMPLES[0]["individual"])
        self.assertEqual(new_sample.derived_samples.first().sample_kind, self.TEST_SAMPLES[0]["sample_kind"])
        self.assertEqual(new_sample.derived_samples.first().library, self.TEST_SAMPLES[0]["library"])
        self.assertEqual(new_sample.derived_by_samples.first().project, self.TEST_SAMPLES[0]["project"])
        self.assertEqual(new_sample.fragment_size, self.TEST_SAMPLES[0]["fragment_size"])
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_create_full_sample_without_collection_site(self):
        new_sample, errors, warnings = create_full_sample(name=self.TEST_SAMPLES[0]["name"],
                                                          volume=self.TEST_SAMPLES[0]["volume"],
                                                          concentration=self.TEST_SAMPLES[0]["concentration"],
                                                          collection_site=None,
                                                          creation_date=self.TEST_SAMPLES[0]["creation_date"],
                                                          container=self.TEST_SAMPLES[0]["container"],
                                                          coordinates=self.TEST_SAMPLES[0]["coordinates"],
                                                          individual=self.TEST_SAMPLES[0]["individual"],
                                                          sample_kind=self.TEST_SAMPLES[0]["sample_kind"],
                                                          library=self.TEST_SAMPLES[0]["library"],
                                                          project=self.TEST_SAMPLES[0]["project"],
                                                          fragment_size=self.TEST_SAMPLES[0]["fragment_size"])
        self.assertEqual(new_sample.name, self.TEST_SAMPLES[0]["name"])
        self.assertEqual(new_sample.volume, self.TEST_SAMPLES[0]["volume"])
        self.assertEqual(new_sample.concentration, self.TEST_SAMPLES[0]["concentration"])
        self.assertIsNone(new_sample.derived_samples.first().biosample.collection_site)
        self.assertEqual(new_sample.creation_date, self.TEST_SAMPLES[0]["creation_date"])
        self.assertEqual(new_sample.container, self.TEST_SAMPLES[0]["container"])
        self.assertEqual(new_sample.coordinates, self.TEST_SAMPLES[0]["coordinates"])
        self.assertEqual(new_sample.derived_samples.first().biosample.individual, self.TEST_SAMPLES[0]["individual"])
        self.assertEqual(new_sample.derived_samples.first().sample_kind, self.TEST_SAMPLES[0]["sample_kind"])
        self.assertEqual(new_sample.derived_samples.first().library, self.TEST_SAMPLES[0]["library"])
        self.assertEqual(new_sample.derived_by_samples.first().project, self.TEST_SAMPLES[0]["project"])
        self.assertEqual(new_sample.fragment_size, self.TEST_SAMPLES[0]["fragment_size"])
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_get_sample_from_container(self):
        sample, errors, warnings = get_sample_from_container(self.samples[0].container.barcode, self.samples[0].coordinates)
        self.assertEqual(sample, self.samples[0])
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_update_sample(self):
        # Make a new sample to make sure not to affect other tests with update
        new_sample, errors, warnings = create_full_sample(name=self.TEST_SAMPLES[0]["name"],
                                                          volume=self.TEST_SAMPLES[0]["volume"],
                                                          concentration=self.TEST_SAMPLES[0]["concentration"],
                                                          collection_site=self.TEST_SAMPLES[0]["collection_site"],
                                                          creation_date=self.TEST_SAMPLES[0]["creation_date"],
                                                          container=self.TEST_SAMPLES[0]["container"],
                                                          coordinates=self.TEST_SAMPLES[0]["coordinates"],
                                                          individual=self.TEST_SAMPLES[0]["individual"],
                                                          sample_kind=self.TEST_SAMPLES[0]["sample_kind"],
                                                          library=self.TEST_SAMPLES[0]["library"],
                                                          project=self.TEST_SAMPLES[0]["project"],
                                                          fragment_size=self.TEST_SAMPLES[0]["fragment_size"])
        sample, errors, warnings = update_sample(new_sample, volume=0, concentration=10, depleted=True, fragment_size=200)
        self.assertEqual(sample, new_sample)
        self.assertEqual(sample.volume, 0)
        self.assertEqual(sample.concentration, 10)
        self.assertTrue(sample.depleted)
        self.assertEqual(sample.fragment_size, 200)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_inherit_sample(self):
        new_sample_data = {"volume": 100,
                           "container": self.test_containers[0],
                           "coordinate_id": self.coord_A04.id}
        derived_samples_destination = []
        volume_ratios = {}
        projects = {}
        for derived_sample in self.samples[0].derived_samples.all():
            derived_samples_destination.append(derived_sample)
            source_derived_by_sample = DerivedBySample.objects.get(sample=self.samples[0], derived_sample=derived_sample)
            volume_ratios[derived_sample.id] = source_derived_by_sample.volume_ratio
            projects[derived_sample.id] = source_derived_by_sample.project
        new_sample, errors, warnings = inherit_sample(sample_source=self.samples[0],
                                                      new_sample_data=new_sample_data,
                                                      derived_samples_destination=derived_samples_destination,
                                                      volume_ratios=volume_ratios,
                                                      projects=projects)
        self.assertEqual(new_sample.volume, new_sample_data["volume"])
        self.assertEqual(new_sample.container, new_sample_data["container"])
        self.assertEqual(new_sample.coordinates, self.coord_A04.name)
        self.assertEqual(new_sample.concentration, self.samples[0].concentration)
        self.assertEqual(new_sample.fragment_size, self.samples[0].fragment_size)
        for derived_sample in new_sample.derived_samples.all():
            self.assertIn(derived_sample, self.samples[0].derived_samples.all())
            self.assertEqual(volume_ratios[derived_sample.id], DerivedBySample.objects.get(sample=new_sample, derived_sample=derived_sample).volume_ratio)
            self.assertEqual(projects[derived_sample.id], DerivedBySample.objects.get(sample=new_sample, derived_sample=derived_sample).project)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_transfer_sample(self):
        source_sample, _, _ = create_full_sample(name=self.TEST_SAMPLES[0]["name"],
                                                 volume=self.TEST_SAMPLES[0]["volume"],
                                                 concentration=self.TEST_SAMPLES[0]["concentration"],
                                                 collection_site=self.TEST_SAMPLES[0]["collection_site"],
                                                 creation_date=self.TEST_SAMPLES[0]["creation_date"],
                                                 container=self.TEST_SAMPLES[0]["container"],
                                                 coordinates=self.TEST_SAMPLES[0]["coordinates"],
                                                 individual=self.TEST_SAMPLES[0]["individual"],
                                                 sample_kind=self.TEST_SAMPLES[0]["sample_kind"],
                                                 library=self.TEST_SAMPLES[0]["library"],
                                                 project=self.TEST_SAMPLES[0]["project"],
                                                 fragment_size=self.TEST_SAMPLES[0]["fragment_size"])
        EXECUTION_DATE = datetime.date(2022, 9, 15)
        protocol_name = "Transfer"
        protocol_obj = Protocol.objects.get(name=protocol_name)
        process_by_protocol, _, _ = create_process(protocol_obj)
        new_sample, errors, warnings = transfer_sample(process=process_by_protocol[protocol_obj.id],
                                                       sample_source=source_sample,
                                                       container_destination=self.test_containers[0],
                                                       coordinates_destination="A06",
                                                       volume_used=100,
                                                       volume_destination=400,
                                                       execution_date=EXECUTION_DATE)
        self.assertEqual(source_sample.volume, self.TEST_SAMPLES[0]["volume"]-100)
        self.assertEqual(new_sample.volume, 400)
        self.assertEqual(new_sample.concentration, self.TEST_SAMPLES[0]["concentration"])
        self.assertEqual(new_sample.fragment_size, self.TEST_SAMPLES[0]["fragment_size"])
        container_sample, _, _ = get_sample_from_container(self.test_containers[0].barcode, "A06")
        self.assertEqual(new_sample, container_sample)
        for derived_sample in new_sample.derived_samples.all():
            self.assertIn(derived_sample, source_sample.derived_samples.all())
        pm = ProcessMeasurement.objects.get(process=process_by_protocol[protocol_obj.id],
                                            source_sample=source_sample,
                                            execution_date=EXECUTION_DATE)
        self.assertIsNotNone(pm)
        sl = SampleLineage.objects.get(process_measurement=pm, parent=source_sample, child=new_sample)
        self.assertIsNotNone(sl)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_extract_sample(self):
        source_sample, _, _ = create_full_sample(name=self.TEST_SAMPLES[1]["name"],
                                                 volume=self.TEST_SAMPLES[1]["volume"],
                                                 collection_site=self.TEST_SAMPLES[1]["collection_site"],
                                                 creation_date=self.TEST_SAMPLES[1]["creation_date"],
                                                 container=self.TEST_SAMPLES[1]["container"],
                                                 coordinates=self.TEST_SAMPLES[1]["coordinates"],
                                                 individual=self.TEST_SAMPLES[1]["individual"],
                                                 sample_kind=self.TEST_SAMPLES[1]["sample_kind"],
                                                 project=self.TEST_SAMPLES[1]["project"],)
        EXECUTION_DATE = datetime.date(2022, 9, 15)
        protocol_name = "Extraction"
        protocol_obj = Protocol.objects.get(name=protocol_name)
        process_by_protocol, _, _ = create_process(protocol_obj)
        extracted_sample, errors, warnings = extract_sample(process=process_by_protocol[protocol_obj.id],
                                                            sample_source=source_sample,
                                                            container_destination=self.test_containers[0],
                                                            volume_used=1000,
                                                            execution_date=EXECUTION_DATE,
                                                            sample_kind_destination=self.sample_kind_dna,
                                                            coordinates_destination="A09",
                                                            volume_destination=200,
                                                            source_depleted=True,
                                                            comment="Extracting dna from a blood sample")
        self.assertEqual(source_sample.volume, self.TEST_SAMPLES[0]["volume"]-1000)
        self.assertEqual(extracted_sample.volume, 200)
        self.assertTrue(source_sample.depleted)
        self.assertIsNone(extracted_sample.fragment_size)
        self.assertFalse(extracted_sample.depleted)
        self.assertEqual(extracted_sample.derived_samples.first().sample_kind, self.sample_kind_dna)
        self.assertEqual(extracted_sample.derived_samples.first().tissue_source, source_sample.derived_samples.first().sample_kind)
        container_sample, _, _ = get_sample_from_container(self.test_containers[0].barcode, "A09")
        self.assertEqual(extracted_sample, container_sample)
        for derived_sample in extracted_sample.derived_samples.all():
            self.assertNotIn(derived_sample, source_sample.derived_samples.all())
        pm = ProcessMeasurement.objects.get(process=process_by_protocol[protocol_obj.id],
                                            source_sample=source_sample,
                                            execution_date=EXECUTION_DATE)
        self.assertIsNotNone(pm)
        sl = SampleLineage.objects.get(process_measurement=pm, parent=source_sample, child=extracted_sample)
        self.assertIsNotNone(sl)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_pool_samples(self):
        POOL_NAME = "Patate"
        EXECUTION_DATE = datetime.date(2022, 9, 15)
        protocol, _ = Protocol.objects.get_or_create(name="Sample pooling")
        process, _, _ = create_process(protocol)

        samples_info = []
        for i, sample in enumerate(self.samples[:2]):
            sample_info = {
                "Source Sample": sample,
                "Source Container Barcode": sample.container.barcode,
                "Source Container Coordinate": sample.coordinates,
                "Source Depleted": False,
                "Volume Used": 20,
                "Volume In Pool": 20,
                "Comment": "Comment " + str(i),
            }
            samples_info.append(sample_info)
        pool, errors, warnings = pool_samples(process=process[protocol.id],
                                              samples_info=samples_info,
                                              pool_name=POOL_NAME,
                                              container_destination=self.test_containers[2],
                                              coordinates_destination=None,
                                              execution_date=EXECUTION_DATE)

        self.assertFalse(errors)
        self.assertFalse(warnings)
        self.assertIsNotNone(pool)
        self.assertEqual(pool.name, POOL_NAME)
        self.assertEqual(pool.volume, Decimal("40"))
        self.assertIsNone(pool.concentration)
        self.assertIsNone(pool.fragment_size)
        self.assertIn(self.samples[0], [sample for sample in pool.parents.all()])
        self.assertIn(self.samples[1], [sample for sample in pool.parents.all()])
        self.assertEqual(pool.container, self.test_containers[2])
        self.assertIsNone(pool.coordinates)
        self.assertEqual(pool.creation_date, EXECUTION_DATE)

        derived_sample_1 = DerivedSample.objects.get(derived_by_samples__sample__id=self.samples[0].id)
        derived_by_sample_parent_1 = DerivedBySample.objects.get(derived_sample=derived_sample_1, sample=self.samples[0])
        derived_by_sample_pool_1 = DerivedBySample.objects.get(derived_sample=derived_sample_1, sample=pool)

        self.assertEqual(derived_by_sample_parent_1.volume_ratio, Decimal("1"))
        self.assertEqual(derived_by_sample_pool_1.volume_ratio, Decimal("0.5"))
        self.assertEqual(derived_by_sample_parent_1.project.name, "Testouille")
        self.assertEqual(derived_by_sample_pool_1.project.name, "Testouille")
        self.assertEqual(derived_sample_1.biosample.individual, self.test_individuals[0])
        self.assertEqual(derived_sample_1.library, self.test_libraries[0])

        derived_sample_2 = DerivedSample.objects.get(derived_by_samples__sample__id=self.samples[1].id)
        derived_by_sample_parent_2 = DerivedBySample.objects.get(derived_sample=derived_sample_2, sample=self.samples[1])
        derived_by_sample_pool_2 = DerivedBySample.objects.get(derived_sample=derived_sample_2, sample=pool)

        self.assertEqual(derived_by_sample_parent_2.volume_ratio, Decimal("1"))
        self.assertEqual(derived_by_sample_pool_2.volume_ratio, Decimal("0.5"))
        self.assertEqual(derived_by_sample_parent_2.project.name, "Projecto")
        self.assertEqual(derived_by_sample_pool_2.project.name, "Projecto")
        self.assertEqual(derived_sample_2.biosample.individual, self.test_individuals[1])
        self.assertEqual(derived_sample_2.library, self.test_libraries[1])
        
    def test_prepare_library(self):
        source_sample, _, _ = create_full_sample(name=self.TEST_SAMPLES[2]["name"],
                                                 volume=self.TEST_SAMPLES[2]["volume"],
                                                 concentration=self.TEST_SAMPLES[2]["concentration"],
                                                 collection_site=self.TEST_SAMPLES[2]["collection_site"],
                                                 creation_date=self.TEST_SAMPLES[2]["creation_date"],
                                                 container=self.TEST_SAMPLES[2]["container"],
                                                 coordinates=self.TEST_SAMPLES[2]["coordinates"],
                                                 individual=self.TEST_SAMPLES[2]["individual"],
                                                 sample_kind=self.TEST_SAMPLES[2]["sample_kind"],
                                                 project=self.TEST_SAMPLES[2]["project"],)
        EXECUTION_DATE = datetime.date(2022, 9, 15)
        protocol_name = "Library Preparation"
        protocol_obj = Protocol.objects.get(name=protocol_name)
        process_by_protocol, _, _ = create_process(protocol_obj)
        libraries_by_derived_sample = {}
        for derived_sample in source_sample.derived_samples.all():
            libraries_by_derived_sample[derived_sample.id] = self.test_libraries[3]
        prepared_library, errors, warnings = prepare_library(process=process_by_protocol[protocol_obj.id],
                                                             sample_source=source_sample,
                                                             container_destination=self.test_containers[0],
                                                             libraries_by_derived_sample=libraries_by_derived_sample,
                                                             volume_used=100,
                                                             execution_date=EXECUTION_DATE,
                                                             coordinates_destination="A11",
                                                             volume_destination=150,
                                                             comment="Preparing library")
        self.assertEqual(source_sample.volume, self.TEST_SAMPLES[2]["volume"]-100)
        self.assertEqual(prepared_library.volume, 150)
        self.assertIsNone(prepared_library.fragment_size)
        self.assertEqual(prepared_library.derived_samples.first().sample_kind, self.sample_kind_dna)
        self.assertEqual(prepared_library.derived_samples.first().library, self.test_libraries[3])
        container_sample, _, _ = get_sample_from_container(self.test_containers[0].barcode, "A11")
        self.assertEqual(prepared_library, container_sample)
        for derived_sample in prepared_library.derived_samples.all():
            self.assertNotIn(derived_sample, source_sample.derived_samples.all())
        pm = ProcessMeasurement.objects.get(process=process_by_protocol[protocol_obj.id],
                                            source_sample=source_sample,
                                            execution_date=EXECUTION_DATE)
        self.assertIsNotNone(pm)
        sl = SampleLineage.objects.get(process_measurement=pm, parent=source_sample, child=prepared_library)
        self.assertIsNotNone(sl)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test__process_sample(self):
        source_sample, _, _ = create_full_sample(name=self.TEST_SAMPLES[2]["name"],
                                                 volume=self.TEST_SAMPLES[2]["volume"],
                                                 concentration=self.TEST_SAMPLES[2]["concentration"],
                                                 collection_site=self.TEST_SAMPLES[2]["collection_site"],
                                                 creation_date=self.TEST_SAMPLES[2]["creation_date"],
                                                 container=self.TEST_SAMPLES[2]["container"],
                                                 coordinates=self.TEST_SAMPLES[2]["coordinates"],
                                                 individual=self.TEST_SAMPLES[2]["individual"],
                                                 sample_kind=self.TEST_SAMPLES[2]["sample_kind"],
                                                 project=self.TEST_SAMPLES[2]["project"])
        EXECUTION_DATE = datetime.date(2022, 9, 15)
        protocol_name = "Library Preparation"
        protocol_obj = Protocol.objects.get(name=protocol_name)
        process_by_protocol, _, _ = create_process(protocol_obj)
        sample_destination_data = dict(
            container_id=self.test_containers[0].id,
            coordinate_id=self.coord_B02.id,
            creation_date=EXECUTION_DATE,
            concentration=None,
            fragment_size=None,
            volume=150,
            depleted=False,
            # Reset QC flags
            quantity_flag=None,
            quality_flag=None
        )
        derived_samples_destination = []
        volume_ratios = {}
        projects = {}
        for derived_sample in source_sample.derived_samples.all():
            new_derived_sample_data = {
                "library_id": self.test_libraries[3].id
            }
            new_derived_sample, _, _ = inherit_derived_sample(derived_sample,
                                                              new_derived_sample_data)
            derived_samples_destination.append(new_derived_sample)
            source_derived_by_sample = DerivedBySample.objects.get(sample=source_sample, derived_sample=derived_sample)
            volume_ratios[new_derived_sample.id] = source_derived_by_sample.volume_ratio
            projects[new_derived_sample.id] = source_derived_by_sample.project

        processed_sample, errors, warnings = _process_sample(process=process_by_protocol[protocol_obj.id],
                                                             sample_source=source_sample,
                                                             sample_destination_data=sample_destination_data,
                                                             derived_samples_destination=derived_samples_destination,
                                                             volume_ratios=volume_ratios,
                                                             projects=projects,
                                                             execution_date=EXECUTION_DATE,
                                                             volume_used=100,
                                                             comment="Internal function test")
        self.assertEqual(source_sample.volume, self.TEST_SAMPLES[2]["volume"])
        self.assertEqual(processed_sample.volume, 150)
        self.assertIsNone(processed_sample.fragment_size)
        self.assertEqual(processed_sample.derived_samples.first().sample_kind, self.sample_kind_dna)
        self.assertEqual(processed_sample.derived_samples.first().library, self.test_libraries[3])
        container_sample, _, _ = get_sample_from_container(self.test_containers[0].barcode, "B02")
        self.assertEqual(processed_sample, container_sample)
        for derived_sample in processed_sample.derived_samples.all():
            self.assertNotIn(derived_sample, source_sample.derived_samples.all())
        pm = ProcessMeasurement.objects.get(process=process_by_protocol[protocol_obj.id],
                                            source_sample=source_sample,
                                            execution_date=EXECUTION_DATE)
        self.assertIsNotNone(pm)
        sl = SampleLineage.objects.get(process_measurement=pm, parent=source_sample, child=processed_sample)
        self.assertIsNotNone(sl)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_update_qc_flags(self):
        new_sample, _, _ = create_full_sample(name=self.TEST_SAMPLES[0]["name"],
                                              volume=self.TEST_SAMPLES[0]["volume"],
                                              concentration=self.TEST_SAMPLES[0]["concentration"],
                                              collection_site=self.TEST_SAMPLES[0]["collection_site"],
                                              creation_date=self.TEST_SAMPLES[0]["creation_date"],
                                              container=self.TEST_SAMPLES[0]["container"],
                                              coordinates=self.TEST_SAMPLES[0]["coordinates"],
                                              individual=self.TEST_SAMPLES[0]["individual"],
                                              sample_kind=self.TEST_SAMPLES[0]["sample_kind"],
                                              library=self.TEST_SAMPLES[0]["library"],
                                              project=self.TEST_SAMPLES[0]["project"],
                                              fragment_size=self.TEST_SAMPLES[0]["fragment_size"])
        updated_sample, errors, warnings = update_qc_flags(sample=new_sample,
                                                           quantity_flag="Passed",
                                                           quality_flag="Failed",
                                                           identity_flag="Passed")
        self.assertEqual(updated_sample, new_sample)
        self.assertTrue(updated_sample.quantity_flag)
        self.assertFalse(updated_sample.quality_flag)
        self.assertTrue(updated_sample.identity_flag)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_remove_qc_flags(self):
        new_sample, _, _ = create_full_sample(name=self.TEST_SAMPLES[0]["name"],
                                              volume=self.TEST_SAMPLES[0]["volume"],
                                              concentration=self.TEST_SAMPLES[0]["concentration"],
                                              collection_site=self.TEST_SAMPLES[0]["collection_site"],
                                              creation_date=self.TEST_SAMPLES[0]["creation_date"],
                                              container=self.TEST_SAMPLES[0]["container"],
                                              coordinates=self.TEST_SAMPLES[0]["coordinates"],
                                              individual=self.TEST_SAMPLES[0]["individual"],
                                              sample_kind=self.TEST_SAMPLES[0]["sample_kind"],
                                              library=self.TEST_SAMPLES[0]["library"],
                                              project=self.TEST_SAMPLES[0]["project"],
                                              fragment_size=self.TEST_SAMPLES[0]["fragment_size"])
        updated_sample, _, _ = update_qc_flags(sample=new_sample,
                                               quantity_flag="Passed",
                                               quality_flag="Failed",
                                               identity_flag="Failed")
        self.assertTrue(updated_sample.quantity_flag)
        self.assertFalse(updated_sample.quality_flag)
        self.assertFalse(updated_sample.identity_flag)
        cleared_sample, errors, warnings = remove_qc_flags(sample=new_sample)
        self.assertEqual(cleared_sample, new_sample)
        self.assertIsNone(cleared_sample.quantity_flag)
        self.assertIsNone(cleared_sample.quality_flag)
        self.assertFalse(cleared_sample.identity_flag)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_add_sample_metadata(self):
        new_sample, _, _ = create_full_sample(name=self.TEST_SAMPLES[0]["name"],
                                              volume=self.TEST_SAMPLES[0]["volume"],
                                              concentration=self.TEST_SAMPLES[0]["concentration"],
                                              collection_site=self.TEST_SAMPLES[0]["collection_site"],
                                              creation_date=self.TEST_SAMPLES[0]["creation_date"],
                                              container=self.TEST_SAMPLES[0]["container"],
                                              coordinates=self.TEST_SAMPLES[0]["coordinates"],
                                              individual=self.TEST_SAMPLES[0]["individual"],
                                              sample_kind=self.TEST_SAMPLES[0]["sample_kind"],
                                              library=self.TEST_SAMPLES[0]["library"],
                                              project=self.TEST_SAMPLES[0]["project"],
                                              fragment_size=self.TEST_SAMPLES[0]["fragment_size"])
        metadata = {
          "TestField1": "I am a potato.",
          "TestField2": "You are a tomato.",
          "PatatePoil": "Coucouroucuicui",
        }
        metadata_added, errors, warnings = add_sample_metadata(sample=new_sample, metadata=metadata)
        self.assertEqual(metadata_added, metadata)
        for metadata_field in new_sample.derived_samples.first().biosample.metadata.all():
            self.assertEqual(metadata[metadata_field.name], metadata_field.value)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_add_invalid_sample_metadata(self):
        new_sample, _, _ = create_full_sample(name=self.TEST_SAMPLES[0]["name"],
                                              volume=self.TEST_SAMPLES[0]["volume"],
                                              concentration=self.TEST_SAMPLES[0]["concentration"],
                                              collection_site=self.TEST_SAMPLES[0]["collection_site"],
                                              creation_date=self.TEST_SAMPLES[0]["creation_date"],
                                              container=self.TEST_SAMPLES[0]["container"],
                                              coordinates=self.TEST_SAMPLES[0]["coordinates"],
                                              individual=self.TEST_SAMPLES[0]["individual"],
                                              sample_kind=self.TEST_SAMPLES[0]["sample_kind"],
                                              library=self.TEST_SAMPLES[0]["library"],
                                              project=self.TEST_SAMPLES[0]["project"],
                                              fragment_size=self.TEST_SAMPLES[0]["fragment_size"])
        metadata = {
          "TestField__Invalid": "You are a tomato.",
        }
        metadata_added, errors, warnings = add_sample_metadata(sample=new_sample, metadata=metadata)
        self.assertTrue("Only alphanumeric characters, periods, dashes and underscores are allowed when naming metadata fields. Note that double underscores i.e '__' are not allowed." in errors[0].messages)
        self.assertEqual(new_sample.derived_samples.first().biosample.metadata.all().count(), 0)

    def test_update_sample_metadata(self):
        new_sample, _, _ = create_full_sample(name=self.TEST_SAMPLES[0]["name"],
                                              volume=self.TEST_SAMPLES[0]["volume"],
                                              concentration=self.TEST_SAMPLES[0]["concentration"],
                                              collection_site=self.TEST_SAMPLES[0]["collection_site"],
                                              creation_date=self.TEST_SAMPLES[0]["creation_date"],
                                              container=self.TEST_SAMPLES[0]["container"],
                                              coordinates=self.TEST_SAMPLES[0]["coordinates"],
                                              individual=self.TEST_SAMPLES[0]["individual"],
                                              sample_kind=self.TEST_SAMPLES[0]["sample_kind"],
                                              library=self.TEST_SAMPLES[0]["library"],
                                              project=self.TEST_SAMPLES[0]["project"],
                                              fragment_size=self.TEST_SAMPLES[0]["fragment_size"])
        metadata = {
          "TestField1": "I am a potato.",
          "TestField2": "You are a tomato.",
          "PatatePoil": "Coucouroukwikwi",
        }
        metadata_added, _, _ = add_sample_metadata(sample=new_sample, metadata=metadata)
        self.assertEqual(metadata_added, metadata)
        for metadata_field in new_sample.derived_samples.first().biosample.metadata.all():
            self.assertEqual(metadata[metadata_field.name], metadata_field.value)
        new_metadata = {
          "TestField1": "I am a tomato.",
          "TestField2": "You are a potato.",
          "PatatePoil": "Coucouroukwakwa",
        }
        metadata_updated, errors, warnings = update_sample_metadata(sample=new_sample, metadata=new_metadata)
        self.assertEqual(metadata_updated, new_metadata)
        for metadata_field in new_sample.derived_samples.first().biosample.metadata.all():
            self.assertEqual(new_metadata[metadata_field.name], metadata_field.value)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_delete_sample_metadata(self):
        new_sample, _, _ = create_full_sample(name=self.TEST_SAMPLES[0]["name"],
                                              volume=self.TEST_SAMPLES[0]["volume"],
                                              concentration=self.TEST_SAMPLES[0]["concentration"],
                                              collection_site=self.TEST_SAMPLES[0]["collection_site"],
                                              creation_date=self.TEST_SAMPLES[0]["creation_date"],
                                              container=self.TEST_SAMPLES[0]["container"],
                                              coordinates=self.TEST_SAMPLES[0]["coordinates"],
                                              individual=self.TEST_SAMPLES[0]["individual"],
                                              sample_kind=self.TEST_SAMPLES[0]["sample_kind"],
                                              library=self.TEST_SAMPLES[0]["library"],
                                              project=self.TEST_SAMPLES[0]["project"],
                                              fragment_size=self.TEST_SAMPLES[0]["fragment_size"])
        metadata = {
          "TestField1": "I am a potato.",
          "TestField2": "You are a tomato.",
          "PatatePoil": "Coucouroukwikwi",
        }
        metadata_added, _, _ = add_sample_metadata(sample=new_sample, metadata=metadata)
        self.assertEqual(metadata_added, metadata)
        for metadata_field in new_sample.derived_samples.first().biosample.metadata.all():
            self.assertEqual(metadata[metadata_field.name], metadata_field.value)
        delete_metadata = {
          "PatatePoil": "Coucouroukwikwi",
        }
        deleted, errors, warnings = remove_sample_metadata(sample=new_sample, metadata=delete_metadata)
        self.assertTrue(deleted)
        self.assertFalse(SampleMetadata.objects.filter(biosample=new_sample.derived_samples.first().biosample, name="PatatePoil").exists())
        for metadata_field in new_sample.derived_samples.first().biosample.metadata.all():
            self.assertEqual(metadata[metadata_field.name], metadata_field.value)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_validate_normalization(self):
        initial_volume = 100
        initial_concentration = 10
        final_volume = 200
        desired_concentration_valid = 5
        desired_concentration_invalid = 6
        is_valid, errors, warnings = validate_normalization(initial_volume=initial_volume,
                                                            initial_concentration=initial_concentration,
                                                            final_volume=final_volume,
                                                            desired_concentration=desired_concentration_valid,
                                                            tolerance=0.01)
        self.assertTrue(is_valid)
        self.assertFalse(errors)
        self.assertFalse(warnings)
        is_valid, errors, warnings = validate_normalization(initial_volume=initial_volume,
                                                            initial_concentration=initial_concentration,
                                                            final_volume=final_volume,
                                                            desired_concentration=desired_concentration_invalid,
                                                            tolerance=0.01)
        self.assertFalse(is_valid)
        self.assertTrue(errors)
        self.assertFalse(warnings)

    def test_pool_submitted_samples(self):
        POOL_NAME = "SubmittedPool"
        EXECUTION_DATE = datetime.date(2022, 9, 15)

        pool, errors, warnings = pool_submitted_samples(samples_info=self.SUBMITTED_SAMPLES_TO_POOL,
                                                        pool_name=POOL_NAME,
                                                        pool_volume=self.SUBMITTED_SAMPLES_TO_POOL_VOLUME,
                                                        container_destination=self.test_containers[2],
                                                        coordinates_destination=None,
                                                        reception_date=EXECUTION_DATE,
                                                        comment="Submitted Pool")

        self.assertFalse(errors)
        self.assertFalse(warnings)
        self.assertIsNotNone(pool)
        self.assertEqual(pool.name, POOL_NAME)
        self.assertEqual(pool.volume, Decimal("40"))
        self.assertIsNone(pool.concentration)
        self.assertIsNone(pool.fragment_size)
        self.assertEqual(pool.container, self.test_containers[2])
        self.assertIsNone(pool.coordinates)
        self.assertEqual(pool.creation_date, EXECUTION_DATE)
        self.assertEqual(pool.comment, "Submitted Pool")

        # There's just connection to the pool since there's no really source sample objects
        derived_samples_pool = DerivedSample.objects.filter(derived_by_samples__sample__id=pool.id)
        self.assertEqual(derived_samples_pool.count(), 2)

        for derived_sample in derived_samples_pool:
            derived_by_sample_pool_ = DerivedBySample.objects.get(derived_sample=derived_sample, sample=pool)

            # first sample in pool
            if derived_sample.biosample.individual.name == "Bob1":
                self.assertEqual(derived_sample.biosample.individual, self.test_individuals[0])
                self.assertEqual(derived_by_sample_pool_.volume_ratio, Decimal("0.25"))
                self.assertEqual(derived_sample.library, self.test_libraries[4])
            else:
                self.assertEqual(derived_sample.biosample.individual, self.test_individuals[1])
                self.assertEqual(derived_by_sample_pool_.volume_ratio, Decimal("0.75"))
                self.assertEqual(derived_sample.library, self.test_libraries[5])

    def test_test_and_update_volume_ratio(self):
        samples: list[dict[str, Any]] = [{ "alias": "A" }, { "alias": "B" }, { "alias": "C" }, { "alias": "D" }]
        errors = []

        errors = test_and_update_volume_ratio(samples=samples)
        self.assertEqual(len(errors), 0)
        self.assertEqual(samples[0]["volume_ratio"], 0.25)
        self.assertEqual(samples[1]["volume_ratio"], 0.25)
        self.assertEqual(samples[2]["volume_ratio"], 0.25)
        self.assertEqual(samples[3]["volume_ratio"], 0.25)

        samples[0]["volume_ratio"] = 0.1
        samples[1]["volume_ratio"] = 0.2
        samples[2]["volume_ratio"] = 0.3
        samples[3]["volume_ratio"] = 0.4
        errors = test_and_update_volume_ratio(samples=samples)
        self.assertEqual(len(errors), 0)

        exp = Decimal(f'1E-{DerivedBySample.VOLUME_RATIO_DECIMAL_PLACES}')

        samples[3]["volume_ratio"] = 0.5
        errors = test_and_update_volume_ratio(samples=samples)
        self.assertEqual(
            errors,
            [f"Volume ratios of the samples in the pool do not add up to 1. Total volume ratio calculated: {Decimal(1.1).quantize(exp)}."]
        )
        samples[3]["volume_ratio"] = 0.3
        errors = test_and_update_volume_ratio(samples=samples)
        self.assertEqual(
            errors,
            [f"Volume ratios of the samples in the pool do not add up to 1. Total volume ratio calculated: {Decimal(0.9).quantize(exp)}."]
        )
        del samples[2]["volume_ratio"]
        del samples[3]["volume_ratio"]
        errors = test_and_update_volume_ratio(samples=samples)
        self.assertEqual(
            errors,
            [
                f"Volume ratio for sample {samples[2]['alias']} is missing but all samples must either define volume ratio or not simultaneously.",
                f"Volume ratio for sample {samples[3]['alias']} is missing but all samples must either define volume ratio or not simultaneously."
            ]
        )
