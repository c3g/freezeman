from fms_core.models import PropertyType, Protocol
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.library_preparation import LibraryPreparationRowHandler, SampleRowHandler
from fms_core.templates import EXPERIMENT_RUN_TEMPLATE_SHEET_INFO
from collections import defaultdict
from .._utils import float_to_decimal_and_none, input_to_date_and_none

PROPERTIES_STARTING_INDEX = 4

# {{TEMPLATE PROPERTY NAME : DB PROPERTY NAME}
TEMPLATE_PROPERTY_MAPPING = {
    "Library Technician Name": "Library Technician Name",
    "Shearing Technician Name": "Shearing Technician Name",
    "Shearing Method": "Shearing Method",
    "Library Kit Used": "Library Kit Used",
    "Library Kit Lot": "Library Kit Lot",
    "PCR Cycles": "PCR Cycles",
    "PCR Enzyme Used": "PCR Enzyme Used",
    "PCR Enzyme Lot": "PCR Enzyme Lot",
    "EZ-96 DNA Methylation-Gold MagPrep Lot": "EZ-96 DNA Methylation-Gold MagPrep Lot",
}

class LibraryPreparationImporter(GenericImporter):
    SHEETS_INFO = EXPERIMENT_RUN_TEMPLATE_SHEET_INFO

    def __init__(self):
        super().__init__()
        self.properties_starting_index = PROPERTIES_STARTING_INDEX


    def initialize_data_for_template(self, runtype, properties):
        # Get protocol for Library Prepration
        protocol = Protocol.objects.get(name='Library Preparation')

        self.preloaded_data = { 'property_types_by_name': {}}

        # Preload PropertyType objects for this protocol in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = {o.name: {'property_type_obj': o} for o in list(PropertyType.objects.filter(object_id=protocol.id))}
        except Exception as e:
            self.base_errors.append(f"Property Type could not be found. {e}")

    def import_template_inner(self):
        """
            SAMPLES SHEET
        """
        samples_sheet = self.sheets['Samples']
        sample_rows_data = defaultdict(list)
        for i, row_data in enumerate(samples_sheet.rows):
            sample = {'library_batch_id': row_data['Library Batch ID'],
                      'volume_used': float_to_decimal_and_none(row_data['Sample Volume Used (uL)']),
                      'comment': row_data['Comment'],
                      'library':
                          {'container':
                            {'library_container_barcode': row_data['Library Container Barcode'],
                             'library_container_coordinates': row_data['Library Container Coordinates'],
                             'library_container_name': row_data['Library Container Name'],
                             'library_container_kind': row_data['Library Container Kind'],
                             'library_container_parent_barcode': row_data['Library Parent Container Barcode'],
                             'library_container_parent_coordinates': row_data['Library Container Coordinates']
                            },
                           'volume': row_data['Library Volume'],
                           'index': row_data['Index'],
                           }
                      }

            sample_kwargs = dict(
                barcode=row_data['Sample Container Barcode'],
                coordinates=row_data['Sample Container Coordinates'],
                volume_used=sample['volume_used']
            )

            (result, sample['sample_obj']) = self.handle_row(
                row_handler_class=SampleRowHandler,
                sheet=samples_sheet,
                row_i=i,
                **sample_kwargs,
            )

            sample_rows_data[sample['library_batch_id']].append(sample)

        """
            LIBRARY SHEET
        """
        libraries_sheet = self.sheets['Library']

        # Iterate through libraries rows
        for row_id, row in enumerate(libraries_sheet.rows):
            library_dict = {}
            process_properties = self.preloaded_data['process_properties']
            for i, (key, val) in enumerate(row.items()):
                if i < self.properties_starting_index:
                    library_dict[key] = row[key]
                else:
                    process_properties[key]['value'] = val

            library_preparation_kwargs = dict(
                # ExperimentRun attributes data dictionary and related objects
                library_type={'name' : library_dict['Experiment Type']},
                container={'barcode': library_dict['Experiment Container Barcode'],
                           'kind': library_dict['Experiment Container Kind']},
                library_date=input_to_date_and_none(library_dict['Library Date (YYYY-MM-DD)']),
                platform={'name' : library_dict['Platform']},
                comment=library_dict['Comment'],
                # Additional data for this row
                process_properties=process_properties,
                sample_rows_info=sample_rows_data[library_dict['Library Batch ID']],
            )

            (result, _) = self.handle_row(
                row_handler_class=LibraryPreparationRowHandler,
                sheet=libraries_sheet,
                row_i=row_id,
                **library_preparation_kwargs,
            )