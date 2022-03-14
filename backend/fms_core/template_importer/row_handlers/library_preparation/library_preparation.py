from fms_core.template_importer.row_handlers._generic import GenericRowHandler

from fms_core.services.library import prepare_library
from fms_core.services.library import get_library_type
from fms_core.services.platform import get_platform
from fms_core.services.container import create_container, get_container


class LibraryPreparationRowHandler(GenericRowHandler):
    def __init__(self):
        super().__init__()

    def process_row(self, **kwargs):
        if len(kwargs['library_rows_info']) < 1:
            self.errors['libraries'] = f"There is no library listed for your preparation {kwargs['library_batch_id']}."

        return super(self.__class__, self).process_row(**kwargs)

    def process_row_inner(self, library_type, library_size, library_date, platform, comment,
                          library_rows_info, protocol, process_properties):

        library_type_obj, self.errors['experiment_type'], self.warnings['experiment_type'] = \
            get_library_type(library_type['name'])

        platform_obj, self.errors['platform'], self.warnings['platform'] = get_platform(platform['name'])

        if library_type_obj and platform_obj:
            # Populate the libraries with the batch and  individual information
            libraries_info = []
            for library_info in library_rows_info:
                container = library_info['container']
                container_coordinates = container['coordinates']

                container_parent_obj = None
                if container['parent_barcode']:
                    container_parent_obj, self.errors['parent_container'], self.warnings['parent_container'] = \
                        get_container(barcode=container['parent_barcode'])

                container_obj, self.errors['library_container'], self.warnings['library_container'] = create_container(
                    name=container['name'],
                    barcode=container['barcode'],
                    kind=container['kind'],
                    container_parent=container_parent_obj if container_parent_obj else None,
                    coordinates=container['parent_coordinates'] if container_parent_obj else None,
                    creation_comment=library_info['comment'])

                library = dict(
                    library_type=library_type,
                    library_size=library_size,
                    library_date=library_date,
                    platform=library_info['platform'],
                    index=library_info['index'],
                    library_volume=library_info['volume'],
                    library_comment=library_info['comment'],
                    container=container_obj,
                    container_coordinates=container_coordinates,
                    # Process measurement information,
                    source_sample=library_info['sample'],
                    volume_used=library_info['volume_used'],
                )

                libraries_info.append(library)

            if not self.errors:
                _, self.errors['library'], self.warnings['library'] = prepare_library(libraries_info,
                                                                                      protocol=protocol,
                                                                                      process_properties=process_properties,
                                                                                      process_comment=comment)
        else:
            self.errors['library_preparation'] = f"Errors prevent the creation of the library."
