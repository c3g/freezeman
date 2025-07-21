from decimal import Decimal
from typing import Tuple, List, TypeVar
from datetime import datetime, date
from django.db import Error
from django.db.models import QuerySet
from django.core.exceptions import ValidationError
from fms_core.models import (Biosample, DerivedSample, DerivedBySample, Sample, ProcessMeasurement, SampleLineage,
                             Container, Process, Library, SampleMetadata, Coordinate)
from .process_measurement import create_process_measurement
from .sample_lineage import create_sample_lineage
from .derived_sample import inherit_derived_sample
from .project import get_project
from .study import get_study
from .sample_next_step import execute_workflow_action, queue_sample_to_study_workflow
from ..utils import RE_SEPARATOR, float_to_decimal, is_date_or_time_after_today, decimal_rounded_to_precision
from fms_core.containers import CONTAINER_SPEC_TUBE
from fms_core._constants import WorkflowAction

def create_full_sample(name, volume, creation_date, container, sample_kind,
                       collection_site=None, library=None, project=None, individual=None,
                       coordinates=None, alias=None, concentration=None, fragment_size=None, tissue_source=None,
                       experimental_group=None, comment=None) -> Tuple[Sample, List[str], List[str]]:
    sample = None
    errors = []
    warnings = []

    # Validate parameters
    if not container:
        errors.append(f"Sample creation requires a container.")
    if not name:
        errors.append(f"Sample creation requires a name.")
    if not volume:
        errors.append(f"Sample creation requires a volume.")
    if not creation_date:
        errors.append(f"Sample creation requires a creation date.")
    if not sample_kind:
        errors.append(f"Sample creation requires a sample kind.")

    if is_date_or_time_after_today(creation_date):
        errors.append(f"Reception date cannot be greater than the current date.")

    if not errors:
        biosample_data = dict(
            **(dict(collection_site=collection_site) if collection_site is not None else dict()),
            **(dict(individual=individual) if individual is not None else dict()),
            **(dict(alias=alias) if alias else dict(alias=name)),
        )

        try:
            biosample = Biosample.objects.create(**biosample_data)

            derived_sample_data = dict(
                biosample_id=biosample.id,
                sample_kind=sample_kind,
                **(dict(library=library) if library is not None else dict()),
                **(dict(tissue_source=tissue_source) if tissue_source is not None else dict()),
            )
            if experimental_group:
                derived_sample_data['experimental_group'] = ([
                    g.strip()
                    for g in RE_SEPARATOR.split(experimental_group)
                    if g.strip()
                ])

            derived_sample = DerivedSample.objects.create(**derived_sample_data)

            coordinate = Coordinate.objects.get(name=coordinates) if coordinates is not None else None
            sample_data = dict(
                name=name,
                volume=volume,
                creation_date=creation_date,
                container=container,
                comment=(comment or (f"Automatically generated on {datetime.utcnow().isoformat()}Z")),
                **(dict(coordinate=coordinate) if coordinate is not None else dict()),
                **(dict(concentration=concentration) if concentration is not None else dict()),
                **(dict(fragment_size=fragment_size) if fragment_size is not None else dict()),
            )

            sample = Sample.objects.create(**sample_data)

            DerivedBySample.objects.create(derived_sample_id=derived_sample.id,
                                           sample_id=sample.id,
                                           volume_ratio=1,
                                           **(dict(project=project) if project is not None else dict()))
        except Coordinate.DoesNotExist as err:
            errors.append(f"Provided coordinates {coordinates} are not valid (Coordinates format example: A01).")
        except ValidationError as e:
            errors.append(';'.join(e.messages))

    return (sample, errors, warnings)


def get_sample_from_container(barcode, coordinates=None):
    sample = None
    container = None
    errors = []
    warnings = []

    if barcode is None:
        errors.append("Container barcode must be specified.")
    else:
        try:
            container = Container.objects.get(barcode=barcode)
        except Container.DoesNotExist as e:
            errors.append(f"Sample from container with barcode {barcode} not found.")

        if container:
            sample_info = dict(
                container=container
            )
            if container.kind == CONTAINER_SPEC_TUBE.container_kind_id and coordinates is not None:
                errors.append(f"Tube containers do not use coordinates. Verify sample container barcode and coordinates.")
            else:
                if coordinates:
                    sample_info['coordinate__name'] = coordinates
                try:
                    sample = Sample.objects.get(**sample_info)
                except Sample.DoesNotExist as e:
                    errors.append(f"Sample from container with barcode {barcode}{f' at coordinates {coordinates}' if coordinates is not None else ''} not found.")
                except Sample.MultipleObjectsReturned  as e:
                    if coordinates:
                        errors.append(f"More than one sample in container with barcode {barcode} found at coordinates {coordinates}.")
                    else:
                        errors.append(f"Multiple samples found in container with barcode {barcode}. You may want to specify coordinates.")

    return (sample, errors, warnings)


def update_sample(sample_to_update, volume=None, concentration=None, depleted=None, fragment_size=None):
    """
    Updates a sample's attributes
    
    Args:
    `sample_to_update`: Sample object to be updated
    `volume`: New volume, if not None
    `concentration`: New concentration, if not None
    `depleted`: New depleted status, if not None
    `fragment_size`: New fragment_size, if not None
    
    Returns:
    Tuple with the updated sample, errors and warnings
    
    """
    errors = []
    warnings = []

    if volume is not None:
        sample_to_update.volume = volume
    if concentration is not None:
        sample_to_update.concentration = float_to_decimal(concentration)
    if depleted is not None:
        sample_to_update.depleted = depleted
    if fragment_size is not None:
        sample_to_update.fragment_size = fragment_size

    try:
        sample_to_update.save()
    except Exception as e:
        errors.append(str(e))

    return (sample_to_update, errors, warnings)


def inherit_sample(sample_source, new_sample_data, derived_samples_destination, volume_ratios, projects):
    """
    Copy an original sample and replace attributes with values provided by new_sample_data.
    Links the new samples to the provided derived samples with the given ratios.

    Args:
        `sample_source`: Sample object instance to be inherited.
        `new_sample_data`: Dictionary of sample attributes to replace the matching ones on the inherited sample.
        `derived_samples_destination`: List of derived sample object instances to be tied to the new sample.
        `volume_ratios`: Dictionary of volume ratios for each derived sample id received in derived_samples_destination.
        `projects`: Dictionary of projects for each derived sample id received in derived_samples_destination.

    Returns:
        Tuple with the created sample if successfully created otherwise None, errors and warnings
    """
    new_sample = None
    errors = []
    warnings = []

    try:
        new_sample = Sample.objects.get(id=sample_source.id)
        new_sample.pk = None
        new_sample.__dict__.update(new_sample_data)
        new_sample.save()

        for derived_sample_destination in derived_samples_destination:
            DerivedBySample.objects.create(sample=new_sample,
                                           derived_sample=derived_sample_destination,
                                           volume_ratio=volume_ratios[derived_sample_destination.id],
                                           project=projects[derived_sample_destination.id])

    except Error as e:
            errors.append(';'.join(e.messages))

    return (new_sample, errors, warnings)


def transfer_sample(process: Process,
                    sample_source: Sample,
                    container_destination: Container,
                    volume_used,
                    execution_date: datetime.date,
                    coordinates_destination=None,
                    volume_destination=None,
                    source_depleted: bool=None,
                    comment=None,
                    workflow=None,
                    project=None):
    sample_destination=None
    errors = []
    warnings = []

    if not process:
        errors.append(f"Process for transfer is required.")
    if not sample_source:
        errors.append(f"Source sample for transfer is required.")
    if not container_destination:
        errors.append(f"Destination container for transfer is required.")

    if volume_used is None:
        errors.append(f"Volume used is required.")
    else:
        if volume_used <= 0:
            errors.append(f"Volume used ({volume_used}) is invalid.")
        if sample_source and volume_used > sample_source.volume:
            errors.append(f"Volume used ({volume_used}) exceeds the current volume of the sample ({sample_source.volume}).")
    
    if not isinstance(execution_date, date):
        errors.append(f"Execution date is not valid.")
    
    if not errors:
        try:
            if source_depleted is not None:
                sample_source.depleted = sample_source.depleted or source_depleted
            sample_source.volume = sample_source.volume - volume_used
            sample_source.save()

            coordinate_destination = Coordinate.objects.get(name=coordinates_destination) if coordinates_destination is not None else None
            sample_destination_data = dict(
                container_id=container_destination.id,
                coordinate_id=coordinate_destination.id if coordinate_destination is not None else None,
                creation_date=execution_date,
                volume=volume_destination if volume_destination is not None else volume_used,
                fragment_size=sample_source.fragment_size,
                depleted=False
            )

            # Prepare and validate for destination sample new project
            new_project_obj = None
            new_study_obj = None
            if project is not None and project.get("destination_project", None) is not None:
                if project.get("destination_study", None) is None:
                    errors.append(f"To set destination project, you need a destination study within that project.")
                else:
                    if workflow.get("step_action") is None:
                        warnings.append(("Assigning a new project and study prevent the transfer from following workflow. Setting workflow action to [{0}].", [WorkflowAction.IGNORE_WORKFLOW.label]))
                        workflow["step_action"] = WorkflowAction.IGNORE_WORKFLOW.label
                    elif workflow.get("step_action") != WorkflowAction.IGNORE_WORKFLOW.label:
                        errors.append(f"Assigning a new project and study is not allowed while following workflow. Set workflow action to [{WorkflowAction.IGNORE_WORKFLOW.label}] if you want to proceed.")
                    if sample_source.is_pool:
                        errors.append(f"Pools cannot be assigned to a new project.")
                    if len(errors) == 0:
                        new_project_obj, errors_project, warnings_project = get_project(project["destination_project"])
                        errors.extend(errors_project)
                        warnings.extend(warnings_project)
                        if new_project_obj is not None:
                            new_study_obj, errors_study, warnings_study = get_study(new_project_obj, project["destination_study"])
                            errors.extend(errors_study)
                            warnings.extend(warnings_study)

            derived_samples_destination = sample_source.derived_samples.all()
            volume_ratios = {}
            projects = {}
            for derived_sample in derived_samples_destination:
                source_derived_by_sample = DerivedBySample.objects.get(sample=sample_source, derived_sample=derived_sample)
                volume_ratios[derived_sample.id] = source_derived_by_sample.volume_ratio
                projects[derived_sample.id] = new_project_obj or source_derived_by_sample.project # new_project_obj is not None if we change destination project

            sample_destination, errors_process, warnings_process = _process_sample(process,
                                                                                   sample_source,
                                                                                   sample_destination_data,
                                                                                   derived_samples_destination,
                                                                                   volume_ratios,
                                                                                   projects,
                                                                                   execution_date,
                                                                                   volume_used,
                                                                                   comment,
                                                                                   workflow)
            errors.extend(errors_process)
            warnings.extend(warnings_process)

            if new_project_obj is not None and new_study_obj is not None:
                # Assign sample destination to given study...
                _, errors_queue, warnings_queue = queue_sample_to_study_workflow(sample_destination, new_study_obj)
                errors.extend(errors_queue)
                warnings.extend(warnings_queue)

        except Coordinate.DoesNotExist as err:
            errors.append(f"Provided coordinates {coordinates_destination} are not valid (Coordinates format example: A01).")
        except Exception as e:
            errors.append(e)

    return (sample_destination, errors, warnings)


def extract_sample(process: Process,
                   sample_source: Sample,
                   container_destination: Container,
                   volume_used,
                   execution_date: datetime.date,
                   sample_kind_destination,
                   coordinates_destination=None,
                   volume_destination=None,
                   source_depleted: bool=None,
                   comment=None,
                   workflow=None):
    sample_destination = None
    errors = []
    warnings = []

    if not process:
        errors.append(f"Process for extraction is required.")
    if not sample_source:
        errors.append(f"Source sample for extraction is required.")
    if not container_destination:
        errors.append(f"Destination container for extraction is required.")
    if sample_kind_destination is None:
        errors.append(f"Sample kind of the extracted sample is required.")

    if volume_used is None:
        errors.append(f"Volume used is required.")
    else:
        if volume_used <= 0:
            errors.append(f"Volume used ({volume_used}) is invalid.")
        if sample_source and volume_used > sample_source.volume:
            errors.append(f"Volume used ({volume_used}) exceeds the current volume of the sample ({sample_source.volume}).")
    
    if not isinstance(execution_date, date):
        errors.append(f"Execution date is not valid.")
    
    if not errors:
        try:
            if source_depleted is not None:
                sample_source.depleted = sample_source.depleted or source_depleted
            sample_source.volume = sample_source.volume - volume_used
            sample_source.save()

            coordinate_destination = Coordinate.objects.get(name=coordinates_destination) if coordinates_destination is not None else None
            sample_destination_data = dict(
                container_id=container_destination.id,
                coordinate_id=coordinate_destination.id if coordinate_destination is not None else None,
                creation_date=execution_date,
                volume=volume_destination if volume_destination is not None else volume_used,
                depleted=False
            )

            new_derived_sample_data = {"sample_kind_id": sample_kind_destination.id}

            derived_samples_destination = []
            volume_ratios = {}
            projects = {}
            for derived_sample in sample_source.derived_samples.all():
                new_derived_sample_data["tissue_source_id"] = derived_sample.sample_kind.id
                inherited_derived_sample, errors_inherit, warnings_inherit = inherit_derived_sample(derived_sample, new_derived_sample_data)
                errors.extend(errors_inherit)
                warnings.extend(warnings_inherit)
                derived_samples_destination.append(inherited_derived_sample)
                source_derived_by_sample = DerivedBySample.objects.get(sample=sample_source, derived_sample=derived_sample)
                volume_ratios[inherited_derived_sample.id] = source_derived_by_sample.volume_ratio
                projects[inherited_derived_sample.id] = source_derived_by_sample.project

            sample_destination, errors_process, warnings_process = _process_sample(process,
                                                                                   sample_source,
                                                                                   sample_destination_data,
                                                                                   derived_samples_destination,
                                                                                   volume_ratios,
                                                                                   projects,
                                                                                   execution_date,
                                                                                   volume_used,
                                                                                   comment,
                                                                                   workflow)
            errors.extend(errors_process)
            warnings.extend(warnings_process)
        except Coordinate.DoesNotExist as err:
            errors.append(f"Provided coordinates {coordinates_destination} are not valid (Coordinates format example: A01).")
        except Exception as e:
            errors.append(e)

    return (sample_destination, errors, warnings)


def pool_samples(process: Process,
                 samples_info,
                 pool_name,
                 container_destination: Container,
                 coordinates_destination,
                 execution_date: datetime.date):
    """
    Creates the internal structures required to represent a pool formed by combining the source samples
    listed in samples_info. Source samples have their volume reduced by the volume used.
    The process parameter is used to create ProcessMeasurement for each source sample. A new pool sample
    is created. Each source sample have a lineage created between source sample and pool sample.
    The source sample derived samples are linked to the new pool sample through derivedbysample entries.
    The volume_ratio for each source sample is calculated and stored on the derivedbysample entry.
    Projects associated to the source samples are associated with the pool sample.
     

    Args:
        process: a Process object that represent a single pooling operation.
        samples_info: a dict for source samples info.
                      {"Source Sample",
                       "Source Container Barcode",
                       "Source Container Coordinate",
                       "Source Depleted",
                       "Volume Used",
                       "Volume In Pool",
                       "Comment",
                       "Workflow"}
                      Workflow contains step_action and step to manage workflow.
        pool_name: the name given to the pool by the user (sample.name).
        container_destination: a container object that will receive the pool.
        coordinates_destination: the coordinate on the container where the pool is stored.
        execution_date: the date where the pooling operation was completed.

    Returns:
        a tuple containing the following data.
        sample_destination: a sample object that represents the new pool.
        errors: errors that were encountered during the pool creation.
        warnings: warnings to inform the user of potential mistakes or dangerous operations.
    """
    sample_destination = None
    errors = []
    warnings = []

    if not process:
        errors.append(f"Process for extraction is required.")
    if not samples_info:
        errors.append(f"Information must be provided about the samples to pool.")
    if not container_destination:
        errors.append(f"Destination container for extraction is required.")
    if not pool_name:
        errors.append(f"Pool Name is required.")
    if not isinstance(execution_date, date):
        errors.append(f"Execution date is not valid.")
    
    if not errors:
        volume = decimal_rounded_to_precision(Decimal(sum(sample["Volume In Pool"] for sample in samples_info))) # Calculate the total volume of the pool
        for sample in samples_info:
            volume_used = decimal_rounded_to_precision(Decimal(sample["Volume Used"]))
            volume_in_pool = decimal_rounded_to_precision(Decimal(sample["Volume In Pool"]))
            sample_obj = sample["Source Sample"]
            if volume_used is None:
                errors.append(f"Volume used is required.")
            else:
                if volume_used <= 0:
                    errors.append(f"Volume used ({volume_used}) is invalid. Volume used needs to be greater than 0.")
                if sample_obj and volume_used > sample_obj.volume:
                    errors.append(f"Volume used ({volume_used} uL) exceeds the current volume of the sample ({sample_obj.volume} uL).")
            if volume_in_pool is None:
                errors.append(f"Volume in pool is required.")
            elif volume_in_pool <= 0:
                    errors.append(f"Volume in pool ({volume_in_pool}) is invalid. Volume in pool needs to be greater than 0.")

            sample["Volume Ratio"] = volume_in_pool / volume # Calculate the volume ratio of each sample in the pool
            sample_obj.volume = sample_obj.volume - volume_used  # Reduce the volume of source samples by the volume used
            if sample["Source Depleted"]:
                sample_obj.depleted=sample["Source Depleted"]
            sample_obj.save()

        try:
            coordinate_destination = Coordinate.objects.get(name=coordinates_destination) if coordinates_destination is not None else None
        except Coordinate.DoesNotExist as err:
            errors.append(f"Provided coordinates {coordinates_destination} are not valid (Coordinates format example: A01).")
        # Create a a new sample - Concentration value is not set (need a QC to set it)
        pool_data = dict(
                name=pool_name,
                volume=volume,
                creation_date=execution_date,
                container=container_destination,
                comment=f"Automatically generated by sample pooling on {datetime.utcnow().isoformat()}Z",
                **(dict(coordinate=coordinate_destination) if coordinate_destination is not None else dict()),
            )
        try:
            sample_destination = Sample.objects.create(**pool_data)
        except Exception as e:
            errors.append(e)

        if sample_destination:
            for sample in samples_info:
                source_sample = sample["Source Sample"]
                volume_ratio = sample["Volume Ratio"]
                comment = sample["Comment"]
                
                # Create the DerivedToSample entries for the pool (flatten inherited derived samples and ratios)
                for derived_sample in source_sample.derived_samples.all():
                    parent_derived_by_sample = DerivedBySample.objects.get(sample=source_sample, derived_sample=derived_sample)
                    parent_volume_ratio = parent_derived_by_sample.volume_ratio
                    final_volume_ratio = decimal_rounded_to_precision(volume_ratio * parent_volume_ratio, 15)
                    parent_project = parent_derived_by_sample.project

                    # In case samples with common derived samples (transfer, normalization, pooling) are pooled together
                    if DerivedBySample.objects.filter(sample=sample_destination, derived_sample=derived_sample).exists():
                        shared_derived_by_sample = DerivedBySample.objects.get(sample=sample_destination, derived_sample=derived_sample)
                        shared_derived_by_sample.volume_ratio = shared_derived_by_sample.volume_ratio + final_volume_ratio
                        shared_derived_by_sample.save()
                    else:
                        try:  # catch duplicates integrity errors
                            DerivedBySample.objects.create(sample=sample_destination,
                                                           derived_sample=derived_sample,
                                                           volume_ratio=final_volume_ratio,
                                                           project=parent_project)
                        except Exception as e:
                            errors.append(e)

            for sample in samples_info:
                source_sample = sample["Source Sample"]
                volume_used = sample["Volume Used"]
                comment = sample["Comment"]
                # Create a process_measurement and sample lineage for each sample pooled
                process_measurement, errors_pm, warnings_pm = create_process_measurement(process=process,
                                                                                         source_sample=source_sample,
                                                                                         execution_date=execution_date,
                                                                                         volume_used=volume_used,
                                                                                         comment=comment)
                errors.extend(errors_pm)
                warnings.extend(warnings_pm)

                if process_measurement: # Need to be executed after DerivedBySample are created because of lineage validations
                    _, errors_sample_lineage, warnings_sample_lineage = create_sample_lineage(parent_sample=source_sample,
                                                                                              child_sample=sample_destination,
                                                                                              process_measurement=process_measurement)
                    errors.extend(errors_sample_lineage)
                    warnings.extend(warnings_sample_lineage)

                    if sample.get("Workflow", None) is not None:
                        errors_workflow, warnings_workflow = execute_workflow_action(workflow_action=sample["Workflow"]["step_action"],
                                                                                     step=sample["Workflow"]["step"],
                                                                                     current_sample=source_sample,
                                                                                     process_measurement=process_measurement,
                                                                                     next_sample=sample_destination)
                        errors.extend(errors_workflow)
                        warnings.extend(warnings_workflow)

    return sample_destination, errors, warnings


def pool_submitted_samples(samples_info,
                           pool_name,
                           container_destination: Container,
                           coordinates_destination,
                           reception_date: datetime.date,
                           comment):
    """
    Creates the internal structure required to represent a pool formed by combining the submitted samples
    listed in samples_info. These samples are not full samples, instead they have the information to create
    their respective derived samples and biosamples. Meaning only one sample object is created: that of the pool.
    This sample is then connected to the created derived samples and biosamples. This service is to be used by the
    sample submission importer due to the necessity of creating pools without having to create futile sample objects
    and containers.
    The volume_ratio is calculated for each source sample and stored on the derivedbysample entry.


    Args:
        samples_info: a dict for source samples info.
                      {"alias",
                       "individual",
                       "collection_site",
                       "sample_kind",
                       "tissue_source",
                       "experimental_group",
                       "library",
                       "project",
                       "studies",
                       "volume"}

        pool_name: the name given to the pool by the user.
        container_destination: a container object that will receive the pool.
        coordinates_destination: the coordinate on the container where the pool is stored.
        reception_date: The date which the pool was received.
        comment: Extra comments to attach to the pool.

    Returns:
        a tuple containing the following data.
        sample_destination: a sample object that represents the new pool.
        errors: errors that were encountered during the pool creation.
        warnings: warnings to inform the user of potential mistakes or dangerous operations.
    """
    pool_sample_obj = None
    errors = []
    warnings = []

    if not samples_info:
        errors.append(f"Information must be provided about the samples to pool.")
    if not container_destination:
        errors.append(f"Destination container for extraction is required.")
    if not pool_name:
        errors.append(f"Pool Name is required.")
    if not isinstance(reception_date, date):
        errors.append(f"Reception date is not valid.")

    if not errors:
        # Calculate the total volume of the pool
        pool_volume = sum(sample["volume"] for sample in samples_info)
        for sample in samples_info:
            sample_volume = sample["volume"]
            # Calculate the volume ratio of each sample in the pool
            sample["volume_ratio"] = decimal_rounded_to_precision(sample_volume / pool_volume, 15)

        try:
            coordinate_destination = Coordinate.objects.get(name=coordinates_destination) if coordinates_destination is not None else None
        except Coordinate.DoesNotExist as err:
            errors.append(f"Provided coordinates {coordinates_destination} are not valid (Coordinates format example: A01).")
        # Create a a new sample - Concentration value is not set (need a QC to set it)
        pool_data = dict(
            name=pool_name,
            volume=pool_volume,
            creation_date=reception_date,
            container=container_destination,
            comment=comment if comment is not None else f"Automatically generated by pooling submission on {datetime.utcnow().isoformat()}Z",
            **(dict(coordinate=coordinate_destination) if coordinate_destination is not None else dict()),
        )
        try:
            pool_sample_obj = Sample.objects.create(**pool_data)
        except Exception as e:
            errors.append(e)

        if pool_sample_obj:
            for sample in samples_info:
                if sample['library'] is None:
                    errors.append(f"Library for sample {sample['alias']} is missing.")

                volume_ratio = sample["volume_ratio"]

                # Create Derived Samples and Biosamples for each sample
                biosample_data = dict(
                    **(dict(collection_site=sample['collection_site']) if sample['collection_site'] is not None else dict()),
                    **(dict(individual=sample['individual']) if sample['individual'] is not None else dict()),
                    **(dict(alias=sample['alias']) if sample['alias'] is not None else dict()),
                )

                try:
                    biosample = Biosample.objects.create(**biosample_data)

                    derived_sample_data = dict(
                        biosample_id=biosample.id,
                        sample_kind=sample['sample_kind'],
                        **(dict(library=sample['library']) if sample['library'] is not None else dict()),
                        **(dict(tissue_source=sample['tissue_source']) if sample['tissue_source'] is not None else dict()),
                    )
                    if sample['experimental_group']:
                        derived_sample_data['experimental_group'] = ([
                            g.strip()
                            for g in RE_SEPARATOR.split(sample['experimental_group'])
                            if g.strip()
                        ])

                    derived_sample = DerivedSample.objects.create(**derived_sample_data)

                    # Create the DerivedToSample entries for the pool
                    DerivedBySample.objects.create(sample=pool_sample_obj,
                                                   derived_sample=derived_sample,
                                                   volume_ratio=volume_ratio,
                                                   **(dict(project=sample['project']) if sample['project'] is not None else dict()),)

                except Exception as e:
                    errors.append(e)

                for study_obj in sample['studies']:
                    _, errors_study, warnings_study = queue_sample_to_study_workflow(pool_sample_obj, study_obj)
                    errors.extend(errors_study)
                    warnings.extend(warnings_study)


    return pool_sample_obj, errors, warnings


def prepare_library(process: Process,
                    sample_source: Sample,
                    container_destination: Container,
                    libraries_by_derived_sample,
                    volume_used,
                    execution_date: datetime.date,
                    coordinates_destination=None,
                    volume_destination=None,
                    comment=None,
                    workflow=None):
    """
    Converts a sample into a library or a pool of samples into a pool of libraries.

    Args:
        `process`: Process associated to the protocol.
        `sample_source`: The source sample to be converted.
        `container_destination`: The final volume of the sample (uL).
        `libraries_by_derived_sample`: A dictionary of the form { derived_sample_id : library_obj } 
                                       containing a library for each derived sample of the source sample.
        `volume_used`: The source sample's volume ued for the process (uL).
        `execution_date`: The date of the process measurement.
        `coordinates_destination`: The coordinates of the sample destination.
        `volume_destination`: The final volume of the sample (uL).
        `comment`: Extra comments to attach to the process.
        `workflow`: Information about the workflow step and action. Default to None when no action related to workflow is needed.

    Returns:
        The resulting sample or None if errors were encountered. Errors and warnings.
    """

    sample_destination = None
    errors = []
    warnings = []

    if not process:
        errors.append(f"Process is required.")
    if not sample_source:
        errors.append(f"Source sample is required.")
    if not container_destination:
        errors.append(f"Destination container is required.")

    if volume_used is None:
        errors.append(f"Volume used is required.")
    else:
        if volume_used <= 0:
            errors.append(f"Volume used ({volume_used}) is invalid.")
        if sample_source and volume_used > sample_source.volume:
            errors.append(
                f"Volume used ({volume_used}) exceeds the current volume of the sample ({sample_source.volume}).")

    if not isinstance(execution_date, date):
        errors.append(f"Execution date is not valid.")

    if not errors:
        try:
            sample_source.volume = sample_source.volume - volume_used
            sample_source.save()

            coordinate_destination = Coordinate.objects.get(name=coordinates_destination) if coordinates_destination is not None else None
            sample_destination_data = dict(
                container_id=container_destination.id,
                coordinate_id=coordinate_destination.id if coordinate_destination is not None else None,
                creation_date=execution_date,
                concentration=None,
                fragment_size=None,
                volume=volume_destination if volume_destination is not None else volume_used,
                depleted=False,
                # Reset QC flags
                quantity_flag=None,
                quality_flag=None
            )

            derived_samples_destination = []
            volume_ratios = {}
            projects = {}
            # For pools of samples (a library for each derived sample)
            for derived_sample_source in sample_source.derived_samples.all():
                library_obj = libraries_by_derived_sample[derived_sample_source.id]
                new_derived_sample_data = {
                    "library_id": library_obj.id
                }
                new_derived_sample, errors_inherit, warnings_inherit = inherit_derived_sample(derived_sample_source,
                                                                                              new_derived_sample_data)
                errors.extend(errors_inherit)
                warnings.extend(warnings_inherit)

                derived_samples_destination.append(new_derived_sample)
                source_derived_by_sample = DerivedBySample.objects.get(sample=sample_source, derived_sample=derived_sample_source)
                volume_ratios[new_derived_sample.id] = source_derived_by_sample.volume_ratio
                projects[new_derived_sample.id] = source_derived_by_sample.project

            sample_destination, errors_process, warnings_process = _process_sample(process,
                                                                                   sample_source,
                                                                                   sample_destination_data,
                                                                                   derived_samples_destination,
                                                                                   volume_ratios,
                                                                                   projects,
                                                                                   execution_date,
                                                                                   volume_used,
                                                                                   comment,
                                                                                   workflow)
            errors.extend(errors_process)
            warnings.extend(warnings_process)
        except Coordinate.DoesNotExist as err:
            errors.append(f"Provided coordinates {coordinates_destination} are not valid (Coordinates format example: A01).")
        except Exception as e:
            errors.append(e)

    return sample_destination, errors, warnings


def _process_sample(process,
                    sample_source,
                    sample_destination_data,
                    derived_samples_destination,
                    volume_ratios,
                    projects,
                    execution_date,
                    volume_used,
                    comment=None,
                    workflow=None):
    """
    Apply a process to a sample by creating the underlying structure.

    Args:
        `process`: Process associated to the protocol.
        `sample_source`: The source sample to be processed.
        `sample_destination_data`: The new values of sample attributes that are to be applied to the destination sample.
        `derived_samples_destination`: A list of inherited destination derived samples for the sample once processed.
        `volume_ratios`: Dictionary of volume ratios for each derived sample id received in derived_samples_destination.
        `projects`: Dictionary of projects for each derived sample id received in derived_samples_destination.
        `execution_date`: The date of the process measurement.
        `volume_used`: The source sample's volume ued for the process (uL).
        `comment`: Extra comments to attach to the process.
        `workflow`: Information about the workflow step and action. Default to None when no action related to workflow is needed.

    Returns:
        The resulting sample or None if errors were encountered. Errors and warnings.
    """
    sample_destination = None
    errors = []
    warnings = []

    sample_destination, errors_derive, warnings_derive = inherit_sample(sample_source,
                                                                        sample_destination_data,
                                                                        derived_samples_destination,
                                                                        volume_ratios,
                                                                        projects)
    errors.extend(errors_derive)
    warnings.extend(warnings_derive)

    if sample_destination:
        process_measurement, errors_pm, warnings_pm = create_process_measurement(process=process,
                                                                                 source_sample=sample_source,
                                                                                 execution_date=execution_date,
                                                                                 volume_used=volume_used,
                                                                                 comment=comment)
        errors.extend(errors_pm)
        warnings.extend(warnings_pm)

        if process_measurement:
            _, errors_sample_lineage, warnings_sample_lineage = create_sample_lineage(parent_sample=sample_source,
                                                                                      child_sample=sample_destination,
                                                                                      process_measurement=process_measurement)
            errors.extend(errors_sample_lineage)
            warnings.extend(warnings_sample_lineage)

            # Process the workflow action
            if workflow is not None:
                errors_workflow, warnings_workflow = execute_workflow_action(workflow_action=workflow["step_action"],
                                                                             step=workflow["step"],
                                                                             current_sample=sample_source,
                                                                             process_measurement=process_measurement,
                                                                             next_sample=sample_destination)
                errors.extend(errors_workflow)
                warnings.extend(warnings_workflow)

    return (sample_destination, errors, warnings)


def update_qc_flags(sample, quantity_flag: str=None, quality_flag: str=None, identity_flag: str=None):
    """
    Set the quantity_flag and quality_flag to given values.

    Args:
      `sample`: Sample receiving the new flags.
      `quantity_flag`: 'Passed', 'Failed' or None values to set the quantity flag.
      `quality_flag`: 'Passed', 'Failed' or None values to set the quantity flag.
      `identity_flag`: 'Passed', 'Failed' or None values to set the identity flag.
      
    Returns:
      The updated sample, errors and warnings
    """
    errors = []
    warnings = []

    try:
        # Update the QC flags for the given sample
        if (quantity_flag is None and quality_flag is None and identity_flag is None):
            errors.append('At least one QC flag is required.')
        else:
            if quantity_flag is not None:
                if sample.quantity_flag is not None and sample.quantity_flag != (quantity_flag == 'Passed'):
                    warnings.append(("Sample {0} quantity flag will be changed to {1}.", [sample.name, quantity_flag]))
                sample.quantity_flag = (quantity_flag == 'Passed')
            if quality_flag is not None:
                if sample.quality_flag is not None and sample.quality_flag != (quality_flag == 'Passed'):
                    warnings.append(("Sample {0} quality flag will be changed to {1}.", [sample.name, quality_flag]))
                sample.quality_flag = (quality_flag == 'Passed')
            if identity_flag is not None:
                if sample.identity_flag is not None and sample.identity_flag != (identity_flag == 'Passed'):
                    warnings.append(("Sample {0} identity flag will be changed to {1}.", [sample.name, identity_flag]))
                sample.identity_flag = (identity_flag == 'Passed')
            sample.save()
    except Error as e:
        errors.append(';'.join(e.messages))

    return sample, errors, warnings


def remove_qc_flags(sample):
    errors = []
    warnings = []

    try:
        # Remove the QC flags for the given sample, identity qc flag kept unless specifically cleared.
        sample.quantity_flag = None
        sample.quality_flag = None
        sample.save()
    except Error as e:
        errors.append(';'.join(e.messages))

    return sample, errors, warnings


def add_sample_metadata(sample, metadata):
    errors = []
    warnings = []

    if sample and metadata:
        try:
            # Retrieve the biosample of the given sample
            biosample_obj = sample.biosample_not_pool
            for (name, value) in metadata.items():
                # Check if sample has already the metadata
                if SampleMetadata.objects.filter(name=name, biosample=biosample_obj).exists():
                    errors.append(f'Sample [{sample.name}] already has property [{name}] with value [{value}].')
                else:
                    SampleMetadata.objects.create(name=name, value=value, biosample=biosample_obj)
        except ValidationError as e:
            errors.append(e)
    else:
        errors.append('Sample and metadata are required')

    return metadata, errors, warnings


def update_sample_metadata(sample, metadata):
    errors = []
    warnings = []

    if sample and metadata:
        try:
            # Retrieve the biosample of the given sample
            biosample_obj = sample.biosample_not_pool
            for (name, value) in metadata.items():
                # Check if sample has already the metadata
                if SampleMetadata.objects.filter(name=name, biosample=biosample_obj).exists():
                    metadata_obj = SampleMetadata.objects.get(name=name, biosample=biosample_obj)
                    # Add warning if the new value is the same as the old value
                    if metadata_obj.value == value:
                        warnings.append(('Sample [{0}] has metadata [{1}] with the same value [{2}]', [sample.name, name, value]))
                    metadata_obj.value = value
                    metadata_obj.save()
                else:
                    errors.append(f'Sample [{sample.name}] does not have metadata with name [{name}].')
        except ValidationError as e:
            errors.append(e)
    else:
        errors.append('Sample and metadata are required')

    return metadata, errors, warnings


def remove_sample_metadata(sample, metadata):
    deleted = False
    errors = []
    warnings = []

    if sample and metadata:
        try:
            # Retrieve the biosample of the given sample
            biosample_obj = sample.biosample_not_pool
            for (name, value) in metadata.items():
                metadata_obj = SampleMetadata.objects.get(name=name, biosample=biosample_obj)
                # Add warning if the value stored is different from the input value
                if metadata_obj.value != value:
                    errors.append(f'Sample [{sample.name}] has metadata [{name}] with a different value [{value}]')
                else:
                    metadata_obj.delete()
                    deleted = True
        except SampleMetadata.DoesNotExist:
            errors.append(f'Metadata with name [{name}] is not tied to sample [{sample.name}]')
    else:
        errors.append('Sample and metadata are required')

    return deleted, errors, warnings


def validate_normalization(initial_volume, initial_concentration, final_volume, desired_concentration, tolerance=0.1):
    """
         Defines whether a desired concentration is valid given the ratio (initial volume / final volume)

         Args:
             `initial_volume`: The initial volume of the sample (uL).
             `initial_concentration`: The initial concentration of the sample (ng/uL).
             `final_volume`: The final volume of the sample (uL).
             `desired_concentration`: The final concentration of the sample (ng/uL).
             `tolerance`: The tolerance threshold between desired and correct concentration.

         Returns:
             A boolean representing whether the desired concentration is valid or not.
    """

    is_valid = None
    errors = []
    warnings = []

    # Validate parameters
    if initial_volume is None:
        errors.append(f"Initial volume is required to validate concentration.")
    if initial_concentration is None:
        errors.append(f"Initial concentration is invalid.")
    if final_volume is None:
        errors.append(f"Final volume is required for validation.")
    if desired_concentration is None:
        errors.append(f"Final concentration is required for validation.")

    if not errors:
        # Calculate the current amount to be able to calculate final concentration
        solute_amount = initial_concentration * initial_volume
        computed_concentration = solute_amount / final_volume

        delta_concentration = computed_concentration - desired_concentration
        if abs(delta_concentration) <= tolerance:
            is_valid = True
        else:
            errors.append(f'Desired concentration [{desired_concentration}] '
                          f'is not valid given the dilution ratio (source volume used / final volume).')
            is_valid = False

    return is_valid, errors, warnings

def can_remove_sample(sample: Sample) -> Tuple[bool, List[str], List[str]]:
    """
    Tests the conditions for a sample to be removed. The sample :
     - must not be used in any process_measurement.
     - must not have childs (sample_lineage).
    This allow remove any sample that was not processed internally.

    Args:
        `sample`: Sample instance to be tested.

    Returns:
        Tuple with the boolean is_removable, the list of errors and the list of warnings.
    """
    is_removable = False
    errors = []
    warnings = []
    if not isinstance(sample, Sample):
        errors.append(f"Valid sample instance required.")
    else:
        is_child = SampleLineage.objects.filter(child_id=sample.id).exists()
        is_parent = SampleLineage.objects.filter(parent_id=sample.id).exists()
        was_processed = ProcessMeasurement.objects.filter(source_sample_id=sample.id).exists()
        is_removable = not is_child and not is_parent and not was_processed

    return is_removable, errors, warnings

def get_biosample_name(sample: Sample) -> Tuple[bool, List[str], List[str]]:
    """
    Utility function that returns the sample name with the biosample ID as suffix separated by an underscore (_).

    Args:
        sample: Sample for which a unique sample name is required.

    Returns:
        Tuple with the string biosample name, the list of errors and the list of warnings.
    """
    biosample_name = None
    errors = []
    warnings = []
    if sample.is_pool:
        errors.append(f"Sample is a pool and cannot receive a unique biosample name.")
    else:
        biosample_id = str(sample.biosample_not_pool.id)
        biosample_name = sample.name + "_" + biosample_id
    return biosample_name, errors, warnings

def get_id_from_biosample_name(biosample_name: str) -> Tuple[int, List[str], List[str]]:
    """
    Utility function that extracts the biosample ID from the biosample name.

    Args:
        biosample_name: Biosample name build from the sample name and the biosample ID.

    Returns:
        Tuple with the int biosample ID, the list of errors and the list of warnings.
    """
    biosample_id = None
    errors = []
    warnings = []
    
    try:
        biosample_id = int(biosample_name.split("_")[-1])
    except ValueError as err:
        errors.append(f"Biosample ID cannot be extracted from {biosample_name}.")
    return biosample_id, errors, warnings