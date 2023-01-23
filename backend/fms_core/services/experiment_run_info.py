from typing import Any, Dict, Iterable, List, Optional
from dataclasses import asdict, dataclass

from fms_core.coordinates import convert_alpha_digit_coord_to_ordinal
from fms_core.containers import CONTAINER_KIND_SPECS
from fms_core.models import (
    Biosample,
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


# Obj_Id = Optional[int]
Obj_Id = Optional[int]

@dataclass
class RunInfoSample:
    '''
    A collection of the properties required for run processing of
    a sample in an experiment run.
    '''
    # Biosample name, actually
    pool_name: Optional[str]
    sample_name: Optional[str]

    derived_sample_obj_id: Obj_Id = None
    biosample_obj_id: Obj_Id = None

    # Flowcell lane containing the sample
    container_coordinates: Optional[str] = None
    lane: Optional[int] = None

    project_obj_id: Obj_Id = None
    project_name: Optional[str] = None
    hercules_project_id: Optional[str] = None
    hercules_project_name: Optional[str] = None

    pool_volume_ratio: Optional[float] = None

    # individual fields
    expected_sex: Optional[str] = None
    ncbi_taxon_id: Optional[int] = None
    taxon_name: Optional[str] = None
    reference_genome: Optional[str] = None
    
    # library fields
    library_type: Optional[str] = None
    library_size: Optional[float] = None
    index_set_obj_id: Optional[str] = None
    index_set_name: Optional[str] = None
    index_obj_id: Obj_Id = None
    index_name: Optional[str] = None
    index_sequence_3_prime: Optional[List[str]] = None
    index_sequence_5_prime: Optional[List[str]] = None
    library_kit: Optional[str] = None

    # capture fields
    capture_kit: Optional[str] = None
    capture_baits: Optional[str] = None

    #ChIP-Seq
    chip_seq_mark: Optional[str] = None
    

@dataclass
class RunInfo:
    '''
    A collection of the properties from an ExperimentRun that are
    required for run processing.
    '''
    # Manifest version (1.0.0 to start) 
    version: str

    # Experiment run name and id
    run_name: str
    run_obj_id: int
    run_start_date: Optional[str]

    # Flowcell / container for experiment
    container_obj_id: int
    container_barcode: str

    platform: str
    instrument_serial_number: str
    instrument_type: str

    samples: List[RunInfoSample]


RUN_INFO_FILE_VERSION = "1.0.0"


def generate_run_info(experiment_run: ExperimentRun) -> Dict[str, Any]:
    ''' 
    Generates the run info for the experiment, including all of the derived
    samples in the experiment.

    Args:
        `experiment_run`: An ExperimentRun object

    Returns: 
        A RunInfo object as a dict.
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

    return asdict(run_info)


def _generate_run_info_samples(experiment_run: ExperimentRun) -> List[RunInfoSample]:
    ''' 
    Generates the run info for every derived sample in the experiment.
    
    Args:
        `experiment_run`: An ExperimentRun object

    Returns:
        A list of RunInfoSample objects for all of the samples in the experiment run.
    '''
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
    '''
    Generates the run info for all of the derived samples in a pool.
    
    Args:
        `experiment_run`: An ExperimentRun object

        `pool`: A pool of samples from the experiment.

    Returns:
        A list of RunInfoSample objects for the derived samples in the pool.
    '''
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

    Args:
        `experiment_run`: An ExperimentRun object.

        `sample`: The parent sample (usually a pool) of the derived sample

        `derived_sample`: A DerivedSample object.

    Returns:
        A RunInfoSample object.
    '''
    biosample: Optional[Biosample] = derived_sample.biosample
    if biosample is None:
        raise Exception(f'Sample {sample.pk} has no biosample.')

    # For the sample name, we use the biosample alias, which is the name given to the
    # sample by the customer.
    row = RunInfoSample(sample_name=biosample.alias, pool_name=sample.name)

    row.derived_sample_obj_id = derived_sample.pk
    row.biosample_obj_id = biosample.pk

    project: Optional[Project] = derived_sample.project
    if project is None:
        raise Exception(f'Sample {sample.pk} has no project.')
    
    row.project_obj_id = project.id
    row.project_name = project.name
    row.hercules_project_id = project.external_id
    row.hercules_project_name = project.external_name

    row.container_coordinates = sample.coordinates

    # Convert coordinates from A01 format to lane number.
    container_spec = CONTAINER_KIND_SPECS[sample.container.kind]
    if container_spec is None:
        raise Exception(f'Cannot convert coord {sample.coordinates} to lane number. No ContainerSpec found for container kind "{sample.container.kind}".')

    row.lane = convert_alpha_digit_coord_to_ordinal(sample.coordinates, container_spec.coordinate_spec)
    
    # INDIVIDUAL
    if biosample.individual is not None:
        individual: Individual = biosample.individual
        row.expected_sex = individual.sex

        if individual.taxon is not None:
            row.ncbi_taxon_id = individual.taxon.ncbi_id
            row.taxon_name = individual.taxon.name
        
        if individual.reference_genome is not None:
            row.reference_genome = individual.reference_genome.assembly_name

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
                capture_details = _get_capture_details(library)
                row.capture_kit = capture_details['capture_kit']
                row.capture_baits = capture_details['capture_baits']
            elif library.library_selection.name == "ChIP-Seq":
                row.chip_seq_mark = library.library_selection.target

    return row

def _find_library_prep(library: Library) -> Optional[ProcessMeasurement]:
    ''' 
    Given a library, find the Library Preparation process that was used to create the
    library, if any, to extract the library preparation properties (eg. Library Kit).

    Note that not all libraries will have a Library Preparation measurement,
    since they can be imported directly into freezeman without passing the
    Library Preparation step.

    Args:
        `library`: A library, which may or may not have a Library Preparation process.

    Returns:
        A Library Preparation process, or None.
    '''
    
    library_prep: Optional[ProcessMeasurement] = None
    library_to_find : Library = library

    capture_protocol = Protocol.objects.get(name="Library Capture")
    library_prep_protocol: Protocol = Protocol.objects.get(name="Library Preparation")

    if library.library_selection is not None:
        # If a library was captured then that generated a new library instance.
        # We have to find the previous instance, on which the Library Prep was run.
        capture_lineage : Optional[SampleLineage] = None
        try:
            capture_lineage = SampleLineage.objects.get(
                process_measurement__process__protocol_id=capture_protocol.pk,
                child__derived_samples__library__id=library.pk
            )
        except SampleLineage.DoesNotExist:
            # If libraries with capture are submitted directly then there
            # won't be a capture process and thus no lineage.
            pass

        # Now find the derived sample in the parent that contains the same biosample id as our library.
        if capture_lineage is not None:
            try:
                library_to_find = Library.objects.get(derived_sample__samples=capture_lineage.parent, derived_sample__biosample=library.derived_sample.biosample)
            except Library.DoesNotExist:
                raise Exception(f'Cannot find library sample prior to capture. Library ID: {library.pk}')
            
    # Find the library preparation process measurement
    try: 
        lineage: SampleLineage = SampleLineage.objects.get(
            process_measurement__process__protocol_id=library_prep_protocol.pk,
            child__derived_samples__library__id=library_to_find.pk)
        library_prep = lineage.process_measurement
    except SampleLineage.DoesNotExist:
        # A Library Preparation step does not necessarily exist. Samples submitted as libraries
        # will not have gone through the prep step in freezeman.
        pass

    return library_prep

def _get_capture_details(library: Library) -> Dict[str, Optional[str]]:
    '''
    Lookup up the Capture process that created a capture and return the
    details - capture kit and capture baits.

    Throws an exception if the capture process cannot be found.

    Args:
        `library`: A library with a library_selection type of "Capture"

    Returns:
        A dictionary containing capture_kit and capture_baits values.  
    '''
    kit : Optional[str] = None
    baits : Optional[str] = None

    capture_process : Optional[Process] = None
    lineages = SampleLineage.objects.filter(
        process_measurement__process__protocol__name="Library Capture",
        child__derived_samples__library__id=library.pk)
    if lineages:
        capture_process = lineages.first().process_measurement.process

    # Note: capture_process will be None if the user submitted captured libraries
    # directly, without running the capture protocol in freezeman.
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



