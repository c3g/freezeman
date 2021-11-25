import json
from datetime import datetime, date
from django.db import Error
from django.core.exceptions import ValidationError
from fms_core.models import Biosample, DerivedSample, DerivedBySample, Sample, Container, Process
from .process_measurement import create_process_measurement
from .sample_lineage import create_sample_lineage
from .derived_sample import inherit_derived_sample
from ..utils import RE_SEPARATOR, float_to_decimal

def create_full_sample(name, volume, collection_site, creation_date,
                       container, sample_kind,
                       individual=None,
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
                **(dict(tissue_source=tissue_source) if tissue_source is not None else dict()),
            )
            if experimental_group:
                derived_sample_data['experimental_group'] = json.dumps([
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

    if volume:
        sample_to_update.volume = volume
    if concentration:
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
                    source_depleted: bool=None):
    sample_destination=None
    errors = []
    warnings = []

    if not process:
        errors.append(f"Process for transfer is required.")
    if not sample_source:
        errors.append(f"Source sample for transfer is required.")
    if not container_destination:
        errors.append(f"Destination container for transfer is required.")

    if volume_used <= 0:
        errors.append(f"Volume used ({volume_used}) is invalid ")
    if sample_source and volume_used > sample_source.volume:
        errors.append(f"Volume used ({volume_used}) exceeds the current volume of the sample ({sample_source.volume})")
    
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
                volume=volume_destination if volume_destination else volume_used,
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
                                                                                   volume_used)
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
                   source_depleted: bool=None):
    sample_destination = None
    errors = []
    warnings = []

    if not process:
        errors.append(f"Process for extraction is required.")
    if not sample_source:
        errors.append(f"Source sample for extraction is required.")
    if not container_destination:
        errors.append(f"Destination container for extraction is required.")

    if volume_used <= 0:
        errors.append(f"Volume used ({volume_used}) is invalid ")
    if sample_source and volume_used > sample_source.volume:
        errors.append(f"Volume used ({volume_used}) exceeds the current volume of the sample ({sample_source.volume})")
    
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
                volume=volume_destination if volume_destination else volume_used,
                depleted=False
            )
            if concentration_destination:
                sample_destination_data["concentration"] = concentration_destination
         
            new_derived_sample_data = {"sample_kind_id": sample_kind_destination.id}

            derived_samples_destination = []
            volume_ratios = {}
            for derived_sample in sample_source.derived_samples.all():
                new_derived_sample_data["tissue_source"] = DerivedSample.BIOSPECIMEN_TYPE_TO_TISSUE_SOURCE[derived_sample.sample_kind.name]
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
                                                                                   volume_used)
            errors.extend(errors_process)
            warnings.extend(warnings_process)
        except Exception as e:
            errors.append(e)

    return (sample_destination, errors, warnings)

def _process_sample(process,
                    sample_source,
                    sample_destination_data,
                    derived_samples_destination,
                    volume_ratios,
                    execution_date,
                    volume_used):
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
                                                                                 volume_used=volume_used)
        errors.extend(errors_pm)
        warnings.extend(warnings_pm)

        if process_measurement:
            _, errors_sample_lineage, warnings_sample_lineage = create_sample_lineage(parent_sample=sample_source,
                                                                                      child_sample=sample_destination,
                                                                                      process_measurement=process_measurement)
            errors.extend(errors_sample_lineage)
            warnings.extend(warnings_sample_lineage)
    return (sample_destination, errors, warnings)


