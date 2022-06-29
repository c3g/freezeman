
from collections import namedtuple
from decimal import Decimal
from typing import NamedTuple, Union
from django.test import TestCase
from django.contrib.contenttypes.models import ContentType


from fms_core.models import Library, Process, ProcessMeasurement, PropertyType, PropertyValue, Protocol, Sample, SampleKind
from fms_core.models._constants import DOUBLE_STRANDED, SINGLE_STRANDED, DSDNA_MW, SSDNA_MW
from fms_core.services.container import get_or_create_container
from fms_core.services.container import get_or_create_container
from fms_core.services.index import get_index, create_index, get_or_create_index_set
from fms_core.services.library import create_library, get_library_type
from fms_core.services.platform import get_platform
from fms_core.services.sample import create_full_sample, get_sample_from_container
from fms_core.template_importer.importers.library_qc import LibraryQCImporter
from fms_core.tests.test_template_importers._utils import load_template, APP_DATA_ROOT
from fms_core.utils import convert_concentration_from_nm_to_ngbyul


# Hardcoded strings from library QC importer (move these to a constants file?)
LIBRARY_QC_PROTOCOL_NAME = 'Library Quality Control'
LIBRARY_QC_PROCESS_COMMENT = 'Library Quality Control (imported from template)'

TEST_INDEX_SET = 'IDT_10nt_UDI_TruSeq_Adapter'
TEST_INDEX_STRUCTURE = 'TruSeqHT'
TEST_INDEX_001 = 'IDT_10nt_UDI_i7_001-IDT_10nt_UDI_i5_001'

# LibraryData holds the values we need to create libraries for the tests.
class LibraryData(NamedTuple):
    """ LibraryData contains the parameters needed to create a library for testing QC """
    name: str
    container_name: str
    container_kind: str
    container_barcode: str
    coord: Union[str, None]
    index_name: str
    library_type: str
    platform: str
    strandedness: str
    initial_volume: Decimal
    concentration: Decimal
    collection_site: str
    creation_date: str
    sample_kind: str

# ExpectedQCValues holds the values we expect to find in the sample,
# library or process measurement after import.
class ExpectedQCValues(NamedTuple):
    """ ExpectedQCValues contains the values we expect to find in a library after QC """
    measured_volume: float
    volume_used: float
    final_volume: float
    library_size: int
    concentration: float
    quality_instrument: str
    quality_flag: str
    quantity_instrument: str
    quantity_flag: str
    qc_date: str
    comment: str

# Library in a Tube
LIBRARY_DATA_1 = LibraryData(
    name = 'LIBRARY_SAMPLE_1',
    container_name = 'LIBRARYQCTUBE1',
    container_kind = 'Tube',
    container_barcode = 'LIBRARYQCTUBE1',
    coord = None,
    index_name = TEST_INDEX_001,
    library_type = 'PCR-free',
    platform = 'ILLUMINA',
    strandedness = DOUBLE_STRANDED,
    initial_volume = Decimal(100),
    concentration = Decimal(25),
    collection_site='MUHC',
    creation_date='2022-02-28',
    sample_kind='DNA'
)

EXPECTED_VALUES_1 = ExpectedQCValues(
    measured_volume=90,
    volume_used=10,
    final_volume=80,
    library_size=1000,
    concentration=123,
    quality_instrument='Agarose Gel',
    quality_flag='Passed',
    quantity_instrument='PicoGreen',
    quantity_flag='Passed',
    qc_date='2022-06-21',
    comment = 'comment1'
)

# Library in a 96-well plate
LIBRARY_DATA_2 = LibraryData(
    name='LIBRARY_SAMPLE_2',
    container_name = 'LIBRARYQCPLATE2',
    container_kind='96-well plate',
    container_barcode='LIBRARYQCPLATE2',
    coord='A01',
    index_name= TEST_INDEX_001,
    library_type = 'PCR-free',
    platform = 'ILLUMINA',
    strandedness = DOUBLE_STRANDED,
    initial_volume = Decimal(100),
    concentration = Decimal(25),
    collection_site='MUHC',
    creation_date='2022-02-28',
    sample_kind='DNA'
)

EXPECTED_VALUES_2 = ExpectedQCValues(
    measured_volume=100,
    volume_used=10,
    final_volume=90,
    library_size=1000,
    concentration=float(convert_concentration_from_nm_to_ngbyul(Decimal(100), Decimal(DSDNA_MW), Decimal(1000))),
    quality_instrument='Agarose Gel',
    quality_flag='Failed',
    quantity_instrument='PicoGreen',
    quantity_flag='Failed',
    qc_date='2022-06-21',
    comment = 'comment2'
)

# Test RNA sample QC (verify nM concentration computed for RNA)
LIBRARY_DATA_3 = LibraryData(
    name='LIBRARY_SAMPLE_3',
    container_name = 'LIBRARYQCPLATE2',
    container_kind='96-well plate',
    container_barcode='LIBRARYQCPLATE2',
    coord='A02',
    index_name= TEST_INDEX_001,
    library_type = 'PCR-free',
    platform = 'ILLUMINA',
    strandedness = SINGLE_STRANDED,
    initial_volume = Decimal(100),
    concentration = Decimal(25),
    collection_site='MUHC',
    creation_date='2022-02-28',
    sample_kind='RNA'
)

EXPECTED_VALUES_3 = ExpectedQCValues(
    measured_volume=100,
    volume_used=10,
    final_volume=90,
    library_size=1000,
    concentration=float(convert_concentration_from_nm_to_ngbyul(Decimal(100), Decimal(SSDNA_MW), Decimal(1000))),
    quality_instrument='Agarose Gel',
    quality_flag='Passed',
    quantity_instrument='PicoGreen',
    quantity_flag='Failed',
    qc_date='2022-06-21',
    comment = 'comment3'
)

class LibraryQCTestCase(TestCase):
    
    def setUp(self) -> None:
        """ Test initialization """
        self.importer = LibraryQCImporter()
        self.file = APP_DATA_ROOT / "Library_QC_v3_9_0.xlsx"
        ContentType.objects.clear_cache()

        self.prefill_data()


    def prefill_data(self):
        """ Create library objects on which we will run QC """

        # Create index for test libraries
        (index_set, _, _, _) = get_or_create_index_set(set_name=TEST_INDEX_SET)
        create_index(index_set=index_set, index_structure=TEST_INDEX_STRUCTURE, index_name=TEST_INDEX_001)

        self.create_library(LIBRARY_DATA_1)
        self.create_library(LIBRARY_DATA_2)
        self.create_library(LIBRARY_DATA_3)


    def test_import(self):
        """ Import the library QC template and check the results """
        # Basic test for all templates - checks that template is valid
        result = load_template(importer=self.importer, file=self.file)
        self.assertEqual(result['valid'], True)
        
        self.verify_library(LIBRARY_DATA_1, EXPECTED_VALUES_1)
        self.verify_library(LIBRARY_DATA_2, EXPECTED_VALUES_2)
        self.verify_library(LIBRARY_DATA_3, EXPECTED_VALUES_3)


    def create_library(self, data: LibraryData):
        """ Create a library with the given data. Library QC will be run on the library afterwards. """
        # container
        (container, _, errors, warnings) = get_or_create_container(barcode=data.container_barcode,
                                                                    kind = data.container_kind,
                                                                    name = data.container_name)

        # index
        (index, errors, warnings) = get_index(data.index_name)

        # library type
        (library_type, errors, warnings) = get_library_type(name=data.library_type)

        # platform
        (platform, errors, warnings) = get_platform(name=data.platform)

        # sample kind
        (sample_kind, _) = SampleKind.objects.get_or_create(name=data.sample_kind)

        # library
        (library, errors, warnings) = create_library(index=index, library_type=library_type, platform=platform, strandedness=data.strandedness)

        # sample
        (sample, errors, warnings) = create_full_sample(
            name=data.name, volume=data.initial_volume, concentration=data.concentration,
            collection_site=data.collection_site, creation_date=data.creation_date,
            container=container, coordinates=data.coord, sample_kind=sample_kind, library=library)


    def verify_library(self, library_data: LibraryData, expected_values: ExpectedQCValues):
        """ Verify that the db contains a library and that the library contains the expected values. """

        sample: Sample
        sample, _, _ = get_sample_from_container(barcode=library_data.container_barcode, coordinates=library_data.coord)

        # Sample values
        self.assertEqual(sample.volume, expected_values.final_volume)

        # Library values
        library: Library
        library = sample.derived_sample_not_pool.library
        self.assertIsNotNone(library)

        self.assertEqual(library.library_size, expected_values.library_size)

        # Process measurement
        process_measurement: ProcessMeasurement
        process_measurement = ProcessMeasurement.objects.get(source_sample = sample,
                                            execution_date = expected_values.qc_date,
                                            volume_used = expected_values.volume_used)

        process: Process = process_measurement.process
        protocol: Protocol = process.protocol
        
        # Process
        self.assertEqual(process.protocol.name, LIBRARY_QC_PROTOCOL_NAME)
        self.assertEqual(process.comment, LIBRARY_QC_PROCESS_COMMENT)

        # Process measurement
        self.assertEqual(process_measurement.volume_used, expected_values.volume_used)

        # Process measurement property values

        measured_volume = self.get_process_measurement_value('Measured Volume', protocol, process_measurement)
        self.assertEqual(float(measured_volume), expected_values.measured_volume)

        concentration = self.get_process_measurement_value('Concentration', protocol, process_measurement)
        self.assertEqual(float(concentration), expected_values.concentration)

        library_size = self.get_process_measurement_value('Library Size', protocol, process_measurement)
        self.assertEqual(float(library_size), expected_values.library_size)

        quality_flag = self.get_process_measurement_value('Library Quality QC Flag', protocol, process_measurement)
        self.assertEqual(quality_flag, expected_values.quality_flag)

        quality_instrument = self.get_process_measurement_value('Quality Instrument', protocol, process_measurement)
        self.assertEqual(quality_instrument, expected_values.quality_instrument)

        quantity_flag = self.get_process_measurement_value('Library Quantity QC Flag', protocol, process_measurement)
        self.assertEqual(quantity_flag, expected_values.quantity_flag)

        quantity_instrument = self.get_process_measurement_value('Quantity Instrument', protocol, process_measurement)
        self.assertEqual(quantity_instrument, expected_values.quantity_instrument)

        
    def get_process_measurement_value(self, measurement_name: str, protocol: Protocol, process_measurement: ProcessMeasurement):
        """ A utility function to lookup a process measurement value by name, given a process measurement and its protocol. """
        pt = PropertyType.objects.get(name=measurement_name, object_id=protocol.id)
        value_measured_volume = PropertyValue.objects.get(property_type=pt, object_id=process_measurement.id)
        return value_measured_volume.value


