from django.test import TestCase

import datetime
from decimal import Decimal

from fms_core.services.index import get_or_create_index_set, create_index, create_indices_3prime_by_sequence, create_indices_5prime_by_sequence
from fms_core.services.library import (get_library_type, create_library, convert_library, update_library,
                                       convert_library_concentration_from_ngbyul_to_nm, convert_library_concentration_from_nm_to_ngbyul)
from fms_core.services.platform import get_platform
from fms_core.services.process import create_process
from fms_core.services.sample import create_full_sample

from fms_core.models.protocol import Protocol
from fms_core.models.container import Container
from fms_core.models.sample_kind import SampleKind
from fms_core.models.process_measurement import ProcessMeasurement
from fms_core.models.sample_lineage import SampleLineage
from fms_core.models._constants import DOUBLE_STRANDED, SINGLE_STRANDED

class LibraryServicesTestCase(TestCase):
    def setUp(self) -> None:
        self.index_set_name = "TEST_INDEX_SET"
        self.index_name = "TEST_INDEX_1"
        self.library_type_name = "RNASeq"
        self.structure_name = "Nextera"
        self.platform_name = "ILLUMINA"
        self.convertion_platform_name = "DNBSEQ"

        self.library_type_obj, _, _ = get_library_type(self.library_type_name)

        self.index_set, _, _, _ = get_or_create_index_set(self.index_set_name)
        self.index, _, _ = create_index(self.index_name, self.structure_name, self.index_set)
        test_3prime_index = ["CGTTTTATA"]
        test_5prime_index = ["ATTGAATCA"]
        create_indices_3prime_by_sequence(self.index, test_3prime_index)
        create_indices_5prime_by_sequence(self.index, test_5prime_index)

        self.platform_obj, _, _ = get_platform(self.platform_name)

    def test_get_library_type(self):
        library_type_obj, errors, warnings = get_library_type(self.library_type_name)
        self.assertEqual(library_type_obj.name, self.library_type_name)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_create_library(self):
        library_obj, errors, warnings = create_library(library_type=self.library_type_obj,
                                                       index=self.index,
                                                       platform=self.platform_obj,
                                                       strandedness=DOUBLE_STRANDED,
                                                       library_size=150)
        self.assertEqual(library_obj.library_type.name, self.library_type_name)
        self.assertEqual(library_obj.index.name, self.index_name)
        self.assertEqual(library_obj.platform.name, self.platform_name)
        self.assertEqual(library_obj.strandedness, DOUBLE_STRANDED)
        self.assertEqual(library_obj.library_size, 150)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_convert_library(self):
        # init
        CREATION_DATE = datetime.date(2022, 8, 15)
        EXECUTION_DATE = datetime.date(2022, 9, 15)
        self.protocol_name = "Library Conversion"
        self.protocol_obj = Protocol.objects.get(name=self.protocol_name)
        process_by_protocol, _, _ = create_process(self.protocol_obj)
        platform_conversion_obj, _, _ = get_platform(self.convertion_platform_name)
        library_obj, errors, warnings = create_library(library_type=self.library_type_obj,
                                                       index=self.index,
                                                       platform=self.platform_obj,
                                                       strandedness=DOUBLE_STRANDED,
                                                       library_size=150)
        src_container = Container.objects.create(barcode="TESTBARCODE1",
                                                 name="TestName1",
                                                 kind="tube")
        dst_container = Container.objects.create(barcode="TESTBARCODE2",
                                                 name="TestName2",
                                                 kind="tube")
        kind_dna = SampleKind.objects.get(name="DNA")
        sample_source, _, _ = create_full_sample(name="LIBRARY_TO_CONVERT",
                                                 volume=1001,
                                                 collection_site="TestSite",
                                                 creation_date=CREATION_DATE,
                                                 container=src_container,
                                                 sample_kind=kind_dna,
                                                 library=library_obj,
                                                 concentration=10)
        # test
        library_converted, errors, warnings = convert_library(process=process_by_protocol[self.protocol_obj.id],
                                                              platform=platform_conversion_obj,
                                                              sample_source=sample_source,
                                                              container_destination=dst_container,
                                                              coordinates_destination="",
                                                              volume_used=100,
                                                              volume_destination=80,
                                                              execution_date=EXECUTION_DATE,
                                                              comment="Once upon a time...")
        self.assertEqual(library_converted.derived_samples.first().library.platform, platform_conversion_obj)
        self.assertEqual(sample_source.volume, 1001-100)
        self.assertFalse(errors)
        self.assertFalse(warnings)
        pm = ProcessMeasurement.objects.get(process=process_by_protocol[self.protocol_obj.id],
                                            source_sample=sample_source,
                                            execution_date=EXECUTION_DATE)
        self.assertIsNotNone(pm)
        sl = SampleLineage.objects.get(process_measurement=pm, parent=sample_source, child=library_converted)
        self.assertIsNotNone(sl)

    def test_update_library(self):
        # init
        CREATION_DATE = datetime.date(2022, 8, 15)
        library_obj, errors, warnings = create_library(library_type=self.library_type_obj,
                                                       index=self.index,
                                                       platform=self.platform_obj,
                                                       strandedness=DOUBLE_STRANDED,
                                                       library_size=150)
        src_container = Container.objects.create(barcode="TESTBARCODE1",
                                                 name="TestName1",
                                                 kind="tube")
        kind_dna = SampleKind.objects.get(name="DNA")
        sample_source, _, _ = create_full_sample(name="LIBRARY_TO_CONVERT",
                                                 volume=1001,
                                                 collection_site="TestSite",
                                                 creation_date=CREATION_DATE,
                                                 container=src_container,
                                                 sample_kind=kind_dna,
                                                 library=library_obj,
                                                 concentration=10)
        # update values
        new_library_type_obj, _, _ = get_library_type("PCR-enriched")
        new_platform_obj, _, _ = get_platform(self.convertion_platform_name)

        derived_sample, errors, warnings = update_library(derived_sample=sample_source.derived_samples.first(),
                                                          library_type=new_library_type_obj,
                                                          platform=new_platform_obj,
                                                          strandedness=SINGLE_STRANDED,
                                                          library_size=100)
        self.assertEqual(derived_sample.library.library_type, new_library_type_obj)
        self.assertEqual(derived_sample.library.platform, new_platform_obj)
        self.assertEqual(derived_sample.library.strandedness, SINGLE_STRANDED)
        self.assertEqual(derived_sample.library.library_size, 100)
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_convert_library_concentration_from_ngbyul_to_nm(self):
        # init
        CREATION_DATE = datetime.date(2022, 8, 15)
        library_obj, _, _ = create_library(library_type=self.library_type_obj,
                                                       index=self.index,
                                                       platform=self.platform_obj,
                                                       strandedness=DOUBLE_STRANDED,
                                                       library_size=150)
        src_container = Container.objects.create(barcode="TESTBARCODE1",
                                                 name="TestName1",
                                                 kind="tube")
        kind_dna = SampleKind.objects.get(name="DNA")
        sample_source, _, _ = create_full_sample(name="LIBRARY_TO_CONVERT",
                                                 volume=1001,
                                                 collection_site="TestSite",
                                                 creation_date=CREATION_DATE,
                                                 container=src_container,
                                                 sample_kind=kind_dna,
                                                 library=library_obj,
                                                 concentration=10)
        # test
        nm_concentration, errors, warnings = convert_library_concentration_from_ngbyul_to_nm(sample_source, 10)
        self.assertEqual(nm_concentration, Decimal('107.892'))
        self.assertFalse(errors)
        self.assertFalse(warnings)

    def test_convert_library_concentration_from_nm_to_ngbyul(self):
        # init
        CREATION_DATE = datetime.date(2022, 8, 15)
        library_obj, _, _ = create_library(library_type=self.library_type_obj,
                                                       index=self.index,
                                                       platform=self.platform_obj,
                                                       strandedness=DOUBLE_STRANDED,
                                                       library_size=150)
        src_container = Container.objects.create(barcode="TESTBARCODE1",
                                                 name="TestName1",
                                                 kind="tube")
        kind_dna = SampleKind.objects.get(name="DNA")
        sample_source, _, _ = create_full_sample(name="LIBRARY_TO_CONVERT",
                                                 volume=1001,
                                                 collection_site="TestSite",
                                                 creation_date=CREATION_DATE,
                                                 container=src_container,
                                                 sample_kind=kind_dna,
                                                 library=library_obj,
                                                 concentration=10)
        # test
        ngbyul_concentration, errors, warnings = convert_library_concentration_from_nm_to_ngbyul(sample_source, 107.892)
        self.assertEqual(ngbyul_concentration, Decimal('10'))
        self.assertFalse(errors)
        self.assertFalse(warnings)
