import json
from datetime import datetime, date
from django.db import Error
from django.core.exceptions import ValidationError
from fms_core.models import Biosample, DerivedSample, DerivedBySample, Sample, Container, Process, SampleByProject, Library, SampleMetadata
from .process_measurement import create_process_measurement
from .sample_lineage import create_sample_lineage
from .derived_sample import inherit_derived_sample
from ..utils import RE_SEPARATOR, float_to_decimal, is_date_or_time_after_today

def create_full_sample(name, volume, collection_site, creation_date,
                       container, sample_kind, library=None, individual=None,
                       coordinates=None, alias=None, concentration=None, tissue_source=None,
                       experimental_group=None, comment=None):
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
    if not collection_site:
        errors.append(f"Sample creation requires a collection site.")
    if not creation_date:
        errors.append(f"Sample creation requires a creation date.")
    if not sample_kind:
        errors.append(f"Sample creation requires a sample kind.")

    if is_date_or_time_after_today(creation_date):
        errors.append(f"Reception date cannot be greater than the current date.")

    if not errors:
        biosample_data = dict(
            collection_site=collection_site,
            **(dict(individual=individual) if individual is not None else dict()),
            **(dict(alias=alias) if alias is not None else dict()),
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

            sample_data = dict(
                name=name,
                volume=volume,
                creation_date=creation_date,
                container=container,
                comment=(comment or (f"Automatically generated on {datetime.utcnow().isoformat()}Z")),
                **(dict(coordinates=coordinates) if coordinates is not None else dict()),
                **(dict(concentration=concentration) if concentration is not None else dict()),
            )

            sample = Sample.objects.create(**sample_data)

            DerivedBySample.objects.create(derived_sample_id=derived_sample.id,
                                           sample_id=sample.id,
                                           volume_ratio=1)

        except ValidationError as e:
            errors.append(';'.join(e.messages))

    return (sample, errors, warnings)


def get_sample_from_container(barcode, coordinates=None):
    sample = None
    container = None
    errors = []
    warnings = []

    if barcode is None:
        errors.append("Barcode must be specified")
    else:
        try:
            container = Container.objects.get(barcode=barcode)
        except Container.DoesNotExist as e:
            errors.append(f"Sample from container with barcode {barcode} not found.")

        if container:
            sample_info = dict(
                container=container
            )
            if coordinates:
                sample_info['coordinates'] = coordinates
            try:
                sample = Sample.objects.get(**sample_info)
            except Sample.DoesNotExist as e:
                errors.append(f"Sample from container with barcode {barcode} at coordinates {coordinates} not found.")
            except Sample.MultipleObjectsReturned  as e:
                if coordinates:
                    errors.append(f"More than one sample in container with barcode {barcode} found at coordinates {coordinates}.")
                else:
                    errors.append(f"Multiple samples found in container with barcode {barcode}. You may want to specify coordinates.")

    return (sample, errors, warnings)


def update_sample(sample_to_update, volume=None, concentration=None, depleted=None):
    errors = []
    warnings = []

    if volume is not None:
        sample_to_update.volume = volume
    if concentration is not None:
        sample_to_update.concentration = float_to_decimal(concentration)
    if depleted is not None:
        sample_to_update.depleted = depleted

    try:
        sample_to_update.save()
    except Exception as e:
        errors.append(str(e))

    return (sample_to_update, errors, warnings)


def inherit_sample(sample_source, new_sample_data, derived_samples_destination, volume_ratios):
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
                                           volume_ratio=volume_ratios[derived_sample_destination.id])
        
        # project inheritances
        for project in sample_source.projects.all():
            SampleByProject.objects.create(project=project, sample=new_sample)

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
                    comment=None):
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

            sample_destination_data = dict(
                container_id=container_destination.id,
                coordinates=coordinates_destination if coordinates_destination else "",
                creation_date=execution_date,
                volume=volume_destination if volume_destination is not None else volume_used,
                depleted=False
            )

            derived_samples_destination = sample_source.derived_samples.all()
            volume_ratios = {}
            for derived_sample in derived_samples_destination:
                volume_ratios[derived_sample.id] = DerivedBySample.objects.get(sample=sample_source, derived_sample=derived_sample).volume_ratio

            sample_destination, errors_process, warnings_process = _process_sample(process,
                                                                                   sample_source,
                                                                                   sample_destination_data,
                                                                                   derived_samples_destination,
                                                                                   volume_ratios,
                                                                                   execution_date,
                                                                                   volume_used,
                                                                                   comment)
            errors.extend(errors_process)
            warnings.extend(warnings_process)

        except Exception as e:
            errors.append(e)

    return (sample_destination, errors, warnings)


def extract_sample(process: Process,
                   sample_source: Sample,
                   container_destination: Container,
                   volume_used,
                   execution_date: datetime.date,
                   concentration_destination,
                   sample_kind_destination,
                   coordinates_destination=None,
                   volume_destination=None,
                   source_depleted: bool=None,
                   comment=None):
    sample_destination = None
    errors = []
    warnings = []

    if not process:
        errors.append(f"Process for extraction is required.")
    if not sample_source:
        errors.append(f"Source sample for extraction is required.")
    if not container_destination:
        errors.append(f"Destination container for extraction is required.")

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

            sample_destination_data = dict(
                container_id=container_destination.id,
                coordinates=coordinates_destination if coordinates_destination else "",
                creation_date=execution_date,
                volume=volume_destination if volume_destination is not None else volume_used,
                depleted=False
            )
            if concentration_destination:
                sample_destination_data["concentration"] = concentration_destination
         
            new_derived_sample_data = {"sample_kind_id": sample_kind_destination.id}

            derived_samples_destination = []
            volume_ratios = {}
            for derived_sample in sample_source.derived_samples.all():
                new_derived_sample_data["tissue_source_id"] = derived_sample.sample_kind.id
                inherited_derived_sample, errors_inherit, warnings_inherit = inherit_derived_sample(derived_sample, new_derived_sample_data)
                errors.extend(errors_inherit)
                warnings.extend(warnings_inherit)
                derived_samples_destination.append(inherited_derived_sample)
                volume_ratios[inherited_derived_sample.id] = DerivedBySample.objects.get(sample=sample_source, derived_sample=derived_sample).volume_ratio

            sample_destination, errors_process, warnings_process = _process_sample(process,
                                                                                   sample_source,
                                                                                   sample_destination_data,
                                                                                   derived_samples_destination,
                                                                                   volume_ratios,
                                                                                   execution_date,
                                                                                   volume_used,
                                                                                   comment)
            errors.extend(errors_process)
            warnings.extend(warnings_process)
        except Exception as e:
            errors.append(e)

    return (sample_destination, errors, warnings)


# TODO: add docstring
def prepare_library(process: Process,
                    sample_source: Sample,
                    container_destination: Container,
                    libraries_by_derived_sample,
                    volume_used,
                    execution_date: datetime.date,
                    coordinates_destination=None,
                    volume_destination=None,
                    comment=None):
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

            sample_destination_data = dict(
                container_id=container_destination.id,
                coordinates=coordinates_destination if coordinates_destination else "",
                creation_date=execution_date,
                concentration=None,
                volume=volume_destination if volume_destination is not None else volume_used,
                depleted=False,
                # Reset QC flags
                quantity_flag=None,
                quality_flag=None
            )


            derived_samples_destination = []
            volume_ratios = {}
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
                volume_ratios[new_derived_sample.id] = DerivedBySample.objects.get(sample=sample_source,
                                                                                   derived_sample=derived_sample_source).volume_ratio

            sample_destination, errors_process, warnings_process = _process_sample(process,
                                                                                   sample_source,
                                                                                   sample_destination_data,
                                                                                   derived_samples_destination,
                                                                                   volume_ratios,
                                                                                   execution_date,
                                                                                   volume_used,
                                                                                   comment)
            errors.extend(errors_process)
            warnings.extend(warnings_process)

        except Exception as e:
            errors.append(e)

    return sample_destination, errors, warnings


def _process_sample(process,
                    sample_source,
                    sample_destination_data,
                    derived_samples_destination,
                    volume_ratios,
                    execution_date,
                    volume_used,
                    comment=None):
    sample_destination = None
    errors = []
    warnings = []

    sample_destination, errors_derive, warnings_derive = inherit_sample(sample_source,
                                                                        sample_destination_data,
                                                                        derived_samples_destination,
                                                                        volume_ratios)
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
    return (sample_destination, errors, warnings)


def update_qc_flags(sample, quantity_flag, quality_flag):
    errors = []
    warnings = []

    try:
        # Update the QC flags for the given sample
        if quantity_flag and quality_flag:
            sample.quantity_flag = (quantity_flag == 'Passed')
            sample.quality_flag = (quality_flag == 'Passed')
            sample.save()
        else:
            errors.append('Quantity and Quality flags are required.')
    except Error as e:
        errors.append(';'.join(e.messages))

    return sample, errors, warnings


def remove_qc_flags(sample):
    errors = []
    warnings = []

    try:
        # Remove the QC flags for the given sample
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
            # TODO: in case of pools, we should not allow metadata
            biosample_obj = sample.biosample_not_pool
            for (name, value) in metadata.items():
                # Check if sample has already the metadata
                if SampleMetadata.objects.filter(name=name, biosample=biosample_obj).exists():
                    errors.append(f'Sample [{sample.name}] already has property [{name}] with value [{value}].')
                else:
                    SampleMetadata.objects.create(name=name, value=value, biosample=biosample_obj)
        except ValidationError as e:
            errors.append(';'.join(e))
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
                        warnings.append(f'Sample [{sample.name}] has metadata [{name}] with the same value [{value}]')
                    metadata_obj.value = value
                    metadata_obj.save()
                else:
                    errors.append(f'Sample [{sample.name}] does not have metadata with name [{name}].')
        except ValidationError as e:
            errors.append(';'.join(e))
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


def validate_normalization(initial_volume, initial_concentration, final_volume, desired_concentration, tolerance=0.01):
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







