from typing import Iterable, List, TextIO, Union
from dataclasses import asdict, dataclass
from io import StringIO
import json
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
    PropertyType,
    PropertyValue,
    Protocol,
    Sample, 
    SampleLineage,
)

FMS_Id = Union[int, None]

@dataclass
class EventSample:
    fms_sample_name: Union[str, None]

    fms_sample_id: FMS_Id = None
    fms_derived_sample_id: FMS_Id = None
    fms_biosample_id: FMS_Id = None

    # Flowcell lane containing the sample
    fms_container_coordinates: Union[str, None] = None

    fms_project_id: FMS_Id = None
    fms_project_name: Union[str, None] = None
    hercules_project_id: Union[str, None] = None
    hercules_project_name: Union[str, None] = None

    fms_pool_volume_ratio: Union[float, None] = None

    # individual fields
    fms_expected_sex: Union[str, None] = None
    ncbi_taxon_id: Union[int, None] = None
    fms_taxon_name: Union[str, None] = None
    
    # library fields
    fms_platform_name: Union[str, None] = None
    fms_library_type: Union[str, None] = None
    fms_library_size: Union[float, None] = None
    fms_index_id: FMS_Id = None
    fms_index_name: Union[str, None] = None
    fms_index_sequence_3_prime: Union[List[str], None] = None
    fms_index_sequence_5_prime: Union[List[str], None] = None
    fms_library_kit: Union[str, None] = None
    

@dataclass
class EventManifest:
    # Manifest version (1.0.0 to start) 
    version: str

    # Experiment run name and id
    run_name: str
    fms_run_id: int
    fms_run_start_date: Union[str, None]

    # Flowcell / container for experiment
    fms_container_id: int
    fms_container_barcode: str

    instrument_id: str
    fms_instrument_type: str

    samples: List[EventSample]


EVENT_FILE_VERSION = "1.0.0"

def generate_event_file(experiment_run: ExperimentRun, file: TextIO):
    manifest = _generate_event_manifest(experiment_run)

    # TODO after debugging, just serialize the manifest straight to the file
    text_stream = StringIO()

    _serialize_event_manifest(manifest, text_stream)
    file.write(text_stream.getvalue())

    print(text_stream.getvalue())
    text_stream.close()

def _generate_event_manifest(experiment_run: ExperimentRun) -> EventManifest:

    instrument: Instrument = experiment_run.instrument

    start_date = None
    if experiment_run.start_date is not None:
        start_date = experiment_run.start_date.strftime("%Y-%m-%d")

    manifest : EventManifest = EventManifest(
        version=EVENT_FILE_VERSION,
        run_name=experiment_run.name or '',
        fms_run_id=experiment_run.pk,
        fms_run_start_date= start_date,
        fms_container_id=experiment_run.container.pk,
        fms_container_barcode=experiment_run.container.barcode,
        instrument_id=experiment_run.instrument.serial_id,
        fms_instrument_type=instrument.type.type,
        samples=[]
    )

    manifest.samples = _generate_event_manifest_samples(experiment_run)

    return manifest


def _generate_event_manifest_samples(experiment_run: ExperimentRun) -> List[EventSample]:
    generated_rows: List[EventSample] = []
   
    # Get the samples contained in the experiment run container (normally
    # a flow cell with 2 or 4 lanes).
    samples = Sample.objects.filter(container=experiment_run.container)

    for sample in samples:
        if (sample.is_pool):
            generated_rows += _generate_pooled_samples(experiment_run, sample)
        else:
            event_sample = _generate_sample(experiment_run, sample, sample.derived_sample_not_pool)
            generated_rows += [event_sample]

    return generated_rows

def _generate_pooled_samples(experiment_run: ExperimentRun, pool: Sample) -> List[EventSample]:
    event_samples: List[EventSample] = []
    
    derived_samples: Iterable[DerivedSample] = pool.derived_samples.all()
    for derived_sample in derived_samples:
        event_sample = _generate_sample(experiment_run, pool, derived_sample)

        # get the pool volume ratio of the sample
        derived_by_sample: DerivedBySample = DerivedBySample.objects.get(derived_sample=derived_sample, sample=pool)
        event_sample.fms_pool_volume_ratio = float(derived_by_sample.volume_ratio)

        event_samples.append(event_sample)

    return event_samples    

def _generate_sample(experiment_run: ExperimentRun, sample: Sample, derived_sample: DerivedSample) -> EventSample:
    row = EventSample(fms_sample_name=sample.name, fms_sample_id=sample.pk)

    biosample: Union[Biosample, None] = derived_sample.biosample
    if biosample is None:
        raise Exception(f'Sample {sample.pk} has no biosample')

    row.fms_derived_sample_id = derived_sample.pk
    row.fms_biosample_id = biosample.pk

    project: Union[Project, None] = derived_sample.project
    if project is not None:
        row.fms_project_id = project.id
        row.fms_project_name = project.name
        row.hercules_project_id = project.external_id
        row.hercules_project_name = project.external_name

    row.fms_container_coordinates = sample.coordinates

    # INDIVIDUAL
    if biosample.individual is not None:
        individual: Individual = biosample.individual
        row.fms_expected_sex = individual.sex

        if individual.taxon is not None:
            row.ncbi_taxon_id = individual.taxon.ncbi_id
            row.fms_taxon_name = individual.taxon.name

    # LIBRARY
    if derived_sample.library is not None:
        library: Library = derived_sample.library
        index: Index = library.index

        row.fms_platform_name = library.platform.name
        row.fms_library_type = library.library_type.name
        row.fms_library_size = float(library.library_size) if library.library_size is not None else None 

        row.fms_index_id = index.pk
        row.fms_index_name = index.name

        row.fms_index_sequence_3_prime = index.list_3prime_sequences
        row.fms_index_sequence_5_prime = index.list_5prime_sequences

        # Get the Library Preparation process that was run on the library
        # to get the Library Kit property
        lib_prep_measurement = _find_library_prep(library)
        if lib_prep_measurement is not None:
            try:
                property_value = PropertyValue.objects.get(object_id=lib_prep_measurement.process.pk, property_type__name="Library Kit Used")
                if property_value is not None:
                    # row.fms_library_kit = json.loads(property_value.value)
                    row.fms_library_kit = property_value.value
            except PropertyValue.DoesNotExist:
                pass

    return row


def _find_library_prep(library: Library) -> Union[ProcessMeasurement, None]:
    ''' Given a library, find the Library Preparation process that was used to create the
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


def _serialize_event_manifest(event_file: EventManifest, stream: TextIO):
    file_dict = asdict(event_file)
    json.dump(file_dict, stream, indent=4)


