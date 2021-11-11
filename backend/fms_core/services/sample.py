import json
from datetime import datetime, date
from django.db import Error
from django.core.exceptions import ValidationError
from fms_core.models import Biosample, DerivedSample, DerivedBySample, Sample, Container, Process
from .process_measurement import create_process_measurement
from .sample_lineage import create_sample_lineage
from ..utils import RE_SEPARATOR, float_to_decimal

from fms_core.services.derived_sample import derive_sample

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


def transfer_sample(process: Process,
                    sample_source: Sample,
                    destination_container: Container,
                    volume_used,
                    execution_date: datetime.date,
                    concentration_destination=None,
                    resulting_sample_kind=None,
                    coordinates_destination=None,
                    volume_destination=None,
                    source_depleted: bool=None,
                    destination_depleted: bool=None,
                    do_create_derivesample: bool=False,
                    ):
    sample_destination=None
    errors = []
    warnings = []

    if not process:
        errors.append(f"Process for transfer is required.")
    if not sample_source:
        errors.append(f"Source sample for transfer is required.")
    if not destination_container:
        errors.append(f"Destination container for transfer is required.")

    if volume_used <= 0:
        errors.append(f"Volume used ({volume_used}) is invalid ")
    if sample_source and volume_used > sample_source.volume:
        errors.append(f"Volume used ({volume_used}) exceeds the current volume of the sample ({sample_source.volume})")
    
    if not isinstance(execution_date, date):
        errors.append(f"Date execution is not valid.")
    
    if not errors:
        try:
            if source_depleted is not None:
                sample_source.depleted = sample_source.depleted or source_depleted
            sample_source.volume = sample_source.volume - volume_used
            sample_source.save()

            sample_destination_data = dict(
                container_id=destination_container.id,
                coordinates=coordinates_destination if coordinates_destination else "",
                creation_date=execution_date,
                volume=volume_destination if volume_destination else volume_used,
            )
            if destination_depleted:
                sample_destination_data['depleted'] = destination_depleted
            if concentration_destination:
                sample_destination_data['concentration'] = concentration_destination

            if do_create_derivesample:
                new_derived_sample_data = dict(
                    sample_kind=resulting_sample_kind
                )
            else:
                new_derived_sample_data = None

            sample_destination, errors, warnings = derive_sample(sample_source, sample_destination_data,
                                                                 do_create_derivesample, new_derived_sample_data)



            process_measurement, errors_process_measurement, warnings_process_measurement = create_process_measurement(process=process,
                                                                                                                       source_sample=sample_source,
                                                                                                                       execution_date=execution_date,
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
            errors.append(e)

    return (sample_destination, errors, warnings)


def extract_sample(process: Process,
                   sample_source: Sample,
                   container_destination: Container,
                   volume_used,
                   date_execution: datetime.date,
                   resulting_concentration,
                   resulting_sample_kind,
                   coordinates_destination=None,
                   volume_destination=None,
                   source_depleted: bool=None,
                   destination_depleted: bool=None):
    extracted_sample = None
    errors = []
    warnings = []

    # sample_destination = Sample.objects.get(id=sample_source.id)
    # sample_destination.pk = None
    # sample_destination.concentration = resulting_concentration

    transferred_sample, errors, warnings = \
        transfer_sample(process, sample_source, container_destination, volume_used, date_execution,
                        resulting_concentration, resulting_sample_kind, coordinates_destination, volume_destination,
                        source_depleted, destination_depleted, do_create_derivesample=True)

    return (extracted_sample, errors, warnings)






