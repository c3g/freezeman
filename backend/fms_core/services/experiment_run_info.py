from typing import Dict, Iterable, List, TextIO, Union
from dataclasses import asdict, dataclass
import os
import json
from django.conf import settings
from fms_core.utils import make_timestamped_filename
from fms_core.coordinates import convert_alpha_digit_coord_to_ordinal
from fms_core.containers import CONTAINER_KIND_SPECS
from fms_core.models import (
    Biosample,
    Container,
    DerivedSample, 
    DerivedBySample,
    ExperimentRun, 
    Index,
    Individual,
    Instrument, 
    Library,
    Process,
    ProcessMeasurement,
    Project,
    PropertyValue,
    Protocol,
    Sample, 
    SampleLineage,
)


Obj_Id = Union[int, None]

@dataclass
class RunInfoSample:
    # Biosample name, actually
    pool_name: Union[str, None]
    sample_name: Union[str, None]

    derived_sample_obj_id: Obj_Id = None
    biosample_obj_id: Obj_Id = None

    # Flowcell lane containing the sample
    container_coordinates: Union[str, None] = None
    lane: Union[int, None] = None

    project_obj_id: Obj_Id = None
    project_name: Union[str, None] = None
    hercules_project_id: Union[str, None] = None
    hercules_project_name: Union[str, None] = None

    pool_volume_ratio: Union[float, None] = None

    # individual fields
    expected_sex: Union[str, None] = None
    ncbi_taxon_id: Union[int, None] = None
    taxon_name: Union[str, None] = None
    
    # library fields
    library_type: Union[str, None] = None
    library_size: Union[float, None] = None
    index_set_obj_id: Union[str, None] = None
    index_set_name: Union[str, None] = None
    index_obj_id: Obj_Id = None
    index_name: Union[str, None] = None
    index_sequence_3_prime: Union[List[str], None] = None
    index_sequence_5_prime: Union[List[str], None] = None
    library_kit: Union[str, None] = None

    # capture fields
    capture_kit: Union[str, None] = None
    capture_baits: Union[str, None] = None
    

@dataclass
class RunInfo:
    # Manifest version (1.0.0 to start) 
    version: str

    # Experiment run name and id
    run_name: str
    run_obj_id: int
    run_start_date: Union[str, None]

    # Flowcell / container for experiment
    container_obj_id: int
    container_barcode: str

    platform: str
    instrument_serial_number: str
    instrument_type: str

    samples: List[RunInfoSample]


RUN_INFO_FILE_VERSION = "1.0.0"

def generate_run_info_file(experiment_run: ExperimentRun):
    '''
    Generate the run info for an experiment, to be submitted to tech dev for run processing.

    This function writes the data to the file it is given. The file must be text-based, open,
    and writable.

    The output is a RunInfo object in the JSON format.
    '''
    run_info = _generate_run_info(experiment_run)

    file_name_base = experiment_run.name if experiment_run.name else 'experiment_run'
    file_name = make_timestamped_filename(file_name_base, 'json')

    path = os.path.join(settings.RUN_INFO_OUTPUT_PATH, file_name)

    with open(path, "w", encoding="utf-8") as file:
        _serialize_run_info(run_info, file)

def _generate_run_info(experiment_run: ExperimentRun) -> RunInfo:
    ''' 
    Generates the run info for the experiment, including all of the derived
    samples in the experiment.

    Returns a RunInfo object.
    '''
    instrument: Instrument = experiment_run.instrument

    start_date = None
    if experiment_run.start_date is not None:
        start_date = experiment_run.start_date.strftime("%Y-%m-%d")

    run_info : RunInfo = RunInfo(
        version=RUN_INFO_FILE_VERSION,
        run_name=experiment_run.name or '',
        run_obj_id=experiment_run.pk,
        run_start_date= start_date,
        container_obj_id=experiment_run.container.pk,
        container_barcode=experiment_run.container.barcode,
        platform=instrument.type.platform.name,
        instrument_serial_number=experiment_run.instrument.serial_id,
        instrument_type=instrument.type.type,
        samples=[]
    )

    run_info.samples = _generate_run_info_samples(experiment_run)

    return run_info


def _generate_run_info_samples(experiment_run: ExperimentRun) -> List[RunInfoSample]:
    ''' Generates the run info for every derived sample in the experiment. '''
    generated_rows: List[RunInfoSample] = []
   
    # Get the samples contained in the experiment run container (normally
    # a flow cell with 2 or 4 lanes).
    samples = Sample.objects.filter(container=experiment_run.container)

    for sample in samples:
        if (sample.is_pool):
            generated_rows += _generate_pooled_samples(experiment_run, sample)
        else:
            run_info_sample = _generate_sample(experiment_run, sample, sample.derived_sample_not_pool)
            generated_rows += [run_info_sample]

    return generated_rows

def _generate_pooled_samples(experiment_run: ExperimentRun, pool: Sample) -> List[RunInfoSample]:
    ''' Generates the run info for all of the derived samples in a pool. '''
    run_info_samples: List[RunInfoSample] = []
    
    derived_samples: Iterable[DerivedSample] = pool.derived_samples.all()
    for derived_sample in derived_samples:
        run_info_sample = _generate_sample(experiment_run, pool, derived_sample)

        # get the pool volume ratio of the sample
        derived_by_sample: DerivedBySample = DerivedBySample.objects.get(derived_sample=derived_sample, sample=pool)
        run_info_sample.pool_volume_ratio = float(derived_by_sample.volume_ratio)

        run_info_samples.append(run_info_sample)

    return run_info_samples    

def _generate_sample(experiment_run: ExperimentRun, sample: Sample, derived_sample: DerivedSample) -> RunInfoSample:
    '''
    Generates the data for one derived sample in the experiment.
    '''
    biosample: Union[Biosample, None] = derived_sample.biosample
    if biosample is None:
        raise Exception(f'Sample {sample.pk} has no biosample')

    # For the sample name, we use the biosample alias, which is the name given to the
    # sample by the customer.
    row = RunInfoSample(sample_name=biosample.alias, pool_name=sample.name)

    row.derived_sample_obj_id = derived_sample.pk
    row.biosample_obj_id = biosample.pk

    project: Union[Project, None] = derived_sample.project
    if project is not None:
        row.project_obj_id = project.id
        row.project_name = project.name
        row.hercules_project_id = project.external_id
        row.hercules_project_name = project.external_name

    row.container_coordinates = sample.coordinates

    # Convert coordinates from A01 format to lane number.
    row.lane = _convert_flowcell_coordinate_to_lane_number(sample.coordinates, experiment_run.container)
    
    # INDIVIDUAL
    if biosample.individual is not None:
        individual: Individual = biosample.individual
        row.expected_sex = individual.sex

        if individual.taxon is not None:
            row.ncbi_taxon_id = individual.taxon.ncbi_id
            row.taxon_name = individual.taxon.name

    # LIBRARY
    if derived_sample.library is not None:
        library: Library = derived_sample.library
        index: Index = library.index
        
        row.library_type = library.library_type.name
        row.library_size = int(library.library_size) if library.library_size is not None else None 

        row.index_obj_id = index.pk
        row.index_name = index.name

        row.index_sequence_3_prime = index.list_3prime_sequences
        row.index_sequence_5_prime = index.list_5prime_sequences

        if index.index_set is not None:
            row.index_set_obj_id = index.index_set.pk
            row.index_set_name = index.index_set.name

        # Get the Library Preparation process that was run on the library
        # to get the Library Kit property
        lib_prep_measurement = _find_library_prep(library)
        if lib_prep_measurement is not None:
            try:
                property_value = PropertyValue.objects.get(object_id=lib_prep_measurement.process.pk, property_type__name="Library Kit Used")
                if property_value is not None:
                    row.library_kit = property_value.value
            except PropertyValue.DoesNotExist:
                pass

        # Capture
        if library.library_selection is not None:
            if library.library_selection.name == 'Capture':
                capture_details = _get_capture_details(derived_sample)
                row.capture_kit = capture_details['capture_kit']
                row.capture_baits = capture_details['capture_baits']

    return row

def _convert_flowcell_coordinate_to_lane_number(coord: str, container: Container) -> int:
    '''Converts a freezeman coordinate (eg. A01) to an integer flowcell lane number.'''

    container_spec = CONTAINER_KIND_SPECS[container.kind]
    if container_spec is None:
        raise Exception(f'Cannot convert coord {coord} to lane number. No ContainerSpec found for container kind "{container.kind}".')

    lane = convert_alpha_digit_coord_to_ordinal(coord, container_spec.coordinate_spec)
    return lane

def _find_library_prep(library: Library) -> Union[ProcessMeasurement, None]:
    ''' 
    Given a library, find the Library Preparation process that was used to create the
    library, if any, to extract the library preparation properties (eg. Library Kit).

    Note that not all libraries will have a Library Preparation measurement,
    since they can be imported directly into freezeman without passing the
    Library Preparation step.
    '''
    protocol: Protocol = Protocol.objects.get(name="Library Preparation")

    library_prep: Union[ProcessMeasurement, None] = None
    try:
        lineage: SampleLineage = SampleLineage.objects.get(
            process_measurement__process__protocol_id=protocol.pk,
            child__derived_samples__library__id=library.pk)
        library_prep = lineage.process_measurement
    except SampleLineage.DoesNotExist:
        pass
    except SampleLineage.MultipleObjectsReturned:
        pass

    return library_prep


def _find_library_capture_process(derived_sample: DerivedSample) -> Union[Process, None]:
    '''If this is a captured library, find the process measurement from the capture step.'''
    if derived_sample.library is None:
        return None

    if derived_sample.library.library_selection is None:
        return None

    if derived_sample.library.library_selection.name != 'Capture':
        return None

    library_capture_process : Union[Process, None] = None
    lineages = SampleLineage.objects.filter(
        process_measurement__process__protocol__name="Library Capture",
        child__derived_samples__library__id=derived_sample.library.pk)
    if lineages:
        library_capture_process = lineages.first().process_measurement.process
    return library_capture_process
    

def _get_capture_details(derived_sample: DerivedSample) -> Dict[str, Union[str, None]]:
    capture_process = _find_library_capture_process(derived_sample)
    
    kit : Union[str, None] = None
    baits : Union[str, None] = None
    if capture_process is not None:
        try: 
            kit = PropertyValue.objects.get(object_id=capture_process.pk, property_type__name='Library Kit Used').value
        except PropertyValue.DoesNotExist:
            pass
        try:
            baits = PropertyValue.objects.get(object_id=capture_process.pk, property_type__name='Baits Used').value
        except PropertyValue.DoesNotExist:
            pass
       
    return dict(capture_kit=kit, capture_baits=baits)

    return (None, None, None)


def _serialize_run_info(run_info: RunInfo, stream: TextIO):
    '''
    Converts a RunInfo object to JSON and writes it to the given text stream.
    '''
    file_dict = asdict(run_info)
    json.dump(file_dict, stream, indent=4)


