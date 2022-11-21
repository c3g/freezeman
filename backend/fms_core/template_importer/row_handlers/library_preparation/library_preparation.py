from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container, prepare_library
from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.index import get_index
from fms_core.services.library import create_library



class LibraryRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, library_batch_info, source_sample, volume_used,
                          comment, container, volume, index, strandedness):

        if not library_batch_info:
            self.errors['library_preparation'] = 'No batch is associated with this library.'

        # Calling the service creator for Samples in LibraryPreparation
        source_sample_obj, self.errors['container'], self.warnings['container'] = \
            get_sample_from_container(barcode=source_sample['barcode'], coordinates=source_sample['coordinates'])

        if not volume_used:
            self.errors['volume_used'] = f"Volume used must be entered"
        elif source_sample_obj and volume_used > source_sample_obj.volume:
            self.errors['volume_used'] = f"Volume used ({volume_used}) exceeds the current volume of the sample ({source_sample_obj.volume})"

        if source_sample_obj:
            # Check if sample is not a library or a pool of libraries
            if source_sample_obj.is_library:
                self.errors['source_sample'] = f"Source sample can't be a library or a pool of libraries."

            # Add a warning if the sample has failed qc
            if any([source_sample_obj.quality_flag is False, source_sample_obj.quantity_flag is False]):
                self.warnings["qc_flags"] = (f"Source sample {source_sample_obj.name} has failed QC.")

            # Populate the libraries with the batch and  individual information
            protocol = library_batch_info['protocol']
            process_by_protocol = library_batch_info['process_by_protocol']

            # Retrieve process
            process_obj = process_by_protocol[protocol.id]

            container_coordinates = container['coordinates']

            container_parent_obj = None
            if container['parent_barcode']:
                container_parent_obj, self.errors['parent_container'], self.warnings['parent_container'] = \
                    get_container(barcode=container['parent_barcode'])

            container_obj, created, self.errors['library_container'], self.warnings['library_container'] = get_or_create_container(
                name=container['name'],
                barcode=container['barcode'],
                kind=container['kind'],
                container_parent=container_parent_obj if container_parent_obj else None,
                coordinates=container['parent_coordinates'] if container_parent_obj else None,
                creation_comment=comment)

            if container_obj and not created:
                self.warnings['library_container'] = f'Using existing container {container_obj.name}'

            index_obj, self.errors['index'], self.warnings['index'] = get_index(index)

            library_info = dict(
                library_type=library_batch_info['library_type'],
                library_date=library_batch_info['library_date'],
                platform=library_batch_info['platform'],
                index=index_obj,
                strandedness=strandedness,
            )

            libraries_by_derived_sample = {}
            for derived_sample_source in source_sample_obj.derived_samples.all():
                library_obj, self.errors['library'], self.warnings['library'] = create_library(library_type=library_info['library_type'],
                                                                                               index=index_obj,
                                                                                               platform=library_info['platform'],
                                                                                               strandedness=strandedness)
                libraries_by_derived_sample[derived_sample_source.id] = library_obj

            sample_destination, self.errors['library_preparation'], self.warnings['library_preparation'] = \
                prepare_library(process=process_obj,
                                sample_source=source_sample_obj,
                                container_destination=container_obj,
                                libraries_by_derived_sample=libraries_by_derived_sample,
                                volume_used=volume_used,
                                execution_date=library_info['library_date'],
                                coordinates_destination=container_coordinates,
                                volume_destination=volume,
                                comment=comment)
        else:
            self.errors['sample_source'] = 'Sample source is needed to prepare a library.'
