from typing import List, TextIO, Union
from dataclasses import asdict, dataclass
from io import StringIO
import json
from fms_core.models import ExperimentRun, Process, ProcessMeasurement, Sample, DerivedSample, Biosample, Project


@dataclass
class EventSample:
    fms_sample_name: Union[str, None]

    fms_sample_id: Union[int, None] = None
    fms_derived_sample_id: Union[int, None] = None
    fms_biosample_id: Union[int, None] = None

    fms_project_id: Union[str, None] = None
    fms_project_name: Union[str, None] = None
    hercules_project_id: Union[str, None] = None
    hercules_project_name: Union[str, None] = None


@dataclass
class EventManifest:
    version: str
    run_name: str
    fms_run_id: int
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
    # rows = list(map(asdict, _generate_event_manifest_samples(experiment_run=experiment_run)))
    rows = _generate_event_manifest_samples(experiment_run=experiment_run)
    manifest : EventManifest = EventManifest(
        version=EVENT_FILE_VERSION,
        run_name=experiment_run.name,
        fms_run_id=experiment_run.id,
        samples=rows,
    )
    return manifest

def _generate_event_manifest_samples(experiment_run: ExperimentRun) -> List[EventSample]:
    generated_rows: List[EventSample] = []
    # get the process
    process: Process = experiment_run.process

    # get the measurements from the process
    measurements = ProcessMeasurement.objects.filter(process_id=process.id)
    
    # for each measurement, output the sample data
    for measurement in measurements:
        sample = measurement.source_sample
        row = _generate_sample(experiment_run, measurement, sample)
        generated_rows.append(row)

    return generated_rows

def _generate_sample(experiment_run: ExperimentRun, measurement: ProcessMeasurement, sample: Sample) -> EventSample:
    row = EventSample(fms_sample_name=sample.name, fms_sample_id=sample.id)

    derived_sample: DerivedSample = sample.derived_samples.first()    
    biosample: Biosample = sample.biosample_not_pool

    row.fms_derived_sample_id = derived_sample.id
    row.fms_biosample_id = biosample.id

    project: Project = derived_sample.project

    row.fms_project_id = project.id
    row.fms_project_name = project.name
    row.hercules_project_id = project.external_id
    row.hercules_project_name = project.external_name

    return row

def _serialize_event_manifest(event_file: EventManifest, stream: TextIO):
    file_dict = asdict(event_file)
    json.dump(file_dict, stream, indent=4)
