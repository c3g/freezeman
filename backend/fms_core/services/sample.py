import json
from datetime import datetime, date
from django.core.exceptions import ValidationError
from fms_core.models import Biosample, DerivedSample, DerivedBySample, Sample, Container, Process
from .process_measurement import create_process_measurement
from .sample_lineage import create_sample_lineage
from ..utils import RE_SEPARATOR, float_to_decimal

def create_full_sample(name, volume, collection_site, creation_date,
                       container, sample_kind,
                       individual=None,
                       coordinates=None, alias=None, concentration=None, tissue_source=None, phenotype=None,
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
                **(dict(phenotype=phenotype) if phenotype is not None else dict()),
            )

            sample = Sample.objects.create(**sample_data)

            DerivedBySample.objects.create(derivedsample_id=derived_sample.id, sample_id=sample.id)

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


def transfer_sample(process: Process,
                    sample_source: Sample,
                    container_destination: Container,
                    volume_used,
                    date_execution: datetime.date,
                    sample_destination: Sample=None,
                    coordinates_destination=None,
                    volume_destination=None,
                    source_depleted: bool=None,
                    destination_depleted: bool=None):
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
    
    if not isinstance(date_execution, date):
        errors.append(f"Date execution is not valid.")
    
    if not errors:
        try:
            if source_depleted is not None:
                sample_source.depleted = sample_source.depleted or source_depleted
            sample_source.volume = sample_source.volume - volume_used
            sample_source.save()

            # Create destination sample
            if not sample_destination:
                sample_destination = Sample.objects.get(id=sample_source.id)
                sample_destination.pk = None

            sample_destination.container = container_destination
            sample_destination.coordinates = coordinates_destination if coordinates_destination else ""
            sample_destination.creation_date = date_execution

            sample_destination.volume = volume_destination if volume_destination else volume_used
            if destination_depleted is not None:
                sample_destination.depleted = destination_depleted
            sample_destination.save()

            process_measurement, errors_process_measurement, warnings_process_measurement = create_process_measurement(process=process,
                                                                                                                       source_sample=sample_source,
                                                                                                                       execution_date=date_execution,
                                                                                                                       volume_used=volume_used)
            errors.extend(errors_process_measurement)
            warnings.extend(warnings_process_measurement)

            if process_measurement:
                _, errors_sample_lineage, warnings_sample_lineage = create_sample_lineage(parent_sample=sample_source,
                                                                                          child_sample=sample_destination,
                                                                                          process_measurement=process_measurement)
                errors.extend(errors_sample_lineage)
                warnings.extend(warnings_sample_lineage)

        except Exception as e:
            errors.append(';'.join(e.messages))

    return (sample_destination, errors, warnings)