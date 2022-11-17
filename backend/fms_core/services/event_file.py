from decimal import Decimal
from typing import cast, List, TextIO, Union
from dataclasses import asdict, dataclass
from io import StringIO
import json
from fms_core.models import (
    Biosample, 
    Container, 
    DerivedSample, 
    DerivedBySample,
    ExperimentRun, 
    Instrument, 
    InstrumentType, 
    Process, 
    ProcessMeasurement, 
    Project,
    Sample, 
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

@dataclass
class EventManifest:
    # Manifest version (1.0.0 to start) 
    version: str

    # Experiment run name and id
    run_name: str
    fms_run_id: int

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


    manifest : EventManifest = EventManifest(
        version=EVENT_FILE_VERSION,
        run_name=experiment_run.name,
        fms_run_id=experiment_run.id,
        fms_container_id=experiment_run.container.id,
        fms_container_barcode=experiment_run.container.barcode,
        instrument_id=instrument.id,
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
    
    derived_samples = cast(List[DerivedSample], pool.derived_samples.all())
    for derived_sample in derived_samples:
        event_sample = _generate_sample(experiment_run, pool, derived_sample)

        # get the pool volume ratio of the sample
        derived_by_sample: DerivedBySample = DerivedBySample.objects.get(derived_sample=derived_sample, sample=pool)
        event_sample.fms_pool_volume_ratio = float(derived_by_sample.volume_ratio)

        event_samples.append(event_sample)

    return event_samples



def _generate_sample(experiment_run: ExperimentRun, sample: Sample, derived_sample: DerivedSample) -> EventSample:
    row = EventSample(fms_sample_name=sample.name, fms_sample_id=sample.id)

    biosample: Biosample = derived_sample.biosample

    row.fms_derived_sample_id = derived_sample.id
    row.fms_biosample_id = biosample.id

    project: Project = derived_sample.project

    row.fms_project_id = project.id
    row.fms_project_name = project.name
    row.hercules_project_id = project.external_id
    row.hercules_project_name = project.external_name

    row.fms_container_coordinates = sample.coordinates

    return row

def _serialize_event_manifest(event_file: EventManifest, stream: TextIO):
    file_dict = asdict(event_file)
    json.dump(file_dict, stream, indent=4)


