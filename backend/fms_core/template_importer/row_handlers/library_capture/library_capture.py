from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.sample import get_sample_from_container
from fms_core.services.container import get_container, get_or_create_container
from fms_core.services.index import get_index
from fms_core.services.library import capture_library



class LibraryRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row_inner(self, capture_batch_info, source_sample, volume_used,
                          comment, container, volume):

        if not capture_batch_info:
            self.errors['library_capture'] = f"'Capture Batch ID' on sheet 'Library' does not match any on sheet 'Capture Batch'."

        # Calling the service creator for Samples in LibraryPreparation
        source_sample_obj, self.errors['container'], self.warnings['container'] = \
            get_sample_from_container(barcode=source_sample['barcode'], coordinates=source_sample['coordinates'])

        if not volume_used:
            self.errors['volume_used'] = f"Volume used must be entered"
        elif source_sample_obj and volume_used > source_sample_obj.volume:
            self.errors['volume_used'] = f"Volume used ({volume_used}) exceeds the current volume of the sample ({source_sample_obj.volume})"

        if source_sample_obj:
            # Add a warning if the library has failed qc
            if any([source_sample_obj.quality_flag is False, source_sample_obj.quantity_flag is False]):
                self.warnings["qc_flags"] = (f"Source library {source_sample_obj.name} has failed QC.")

            # Check if sample is not a library or a pool of libraries
            if not source_sample_obj.is_library:
                self.errors['source_sample'] = f"Source sample {source_sample_obj.name} must be a library to be captured."

            # Make sure no Capture were previously done on the library
            error = []
            for derived_sample in source_sample_obj.derived_samples.all():
                if derived_sample.library.library_selection is not None:
                    error = f"Source sample {source_sample_obj.name} must not have a selection method applied already (Capture, ChIP-Seq)."
            self.errors['source_sample'].append(error)

            # Populate the libraries with the batch and  individual information
            protocol = capture_batch_info['protocol']
            process_by_protocol = capture_batch_info['process_by_protocol']

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

            library_info = dict(
                library_selection=capture_batch_info['library_selection'],
                capture_date=capture_batch_info['capture_date'],
            )

            # Capture library propagate the capture to all libraries in a pool
            protocol = capture_batch_info['protocol']
            process_by_protocol = capture_batch_info['process_by_protocol']

            # Retrieve process
            process_obj = process_by_protocol[protocol.id]

            if not self.has_errors():
                sample_destination, self.errors['library_conversion'], self.warnings['library_conversion'] = \
                    capture_library(process=process_obj,
                                    library_selection=library_info['library_selection'],
                                    sample_source=source_sample_obj,
                                    container_destination=container_obj,
                                    coordinates_destination=container_coordinates,
                                    volume_used=volume_used,
                                    volume_destination=volume,
                                    execution_date=library_info['capture_date'],
                                    comment=comment)

        else:
            self.errors['sample_source'] = 'Sample source is needed to capture a library.'
