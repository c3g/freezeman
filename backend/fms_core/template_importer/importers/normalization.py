from fms_core.models import Protocol, Process, PropertyType
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.normalization import NormalizationRowHandler
from fms_core.templates import NORMALIZATION_TEMPLATE
from .._utils import (float_to_decimal_and_none, input_to_date_and_none)
from fms_core.utils import str_cast_and_normalize, check_truth_like


class NormalizationImporter(GenericImporter):
    SHEETS_INFO = NORMALIZATION_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()

    def initialize_data_for_template(self):
        # Get protocol for Normalization, which is used for samples and libraries
        protocol = Protocol.objects.get(name='Normalization')

        self.preloaded_data['process'] = Process.objects.create(protocol=protocol,
                                                                comment="Normalization (imported from template)")

        # Preload PropertyType objects for the sample qc in a dictionary for faster access
        try:
            self.preloaded_data['process_properties'] = {property.name: {'property_type_obj': property} for property in
                                                         list(PropertyType.objects.filter(object_id=protocol.id))}

            # Make sure every property has a value property, even if it is not used.
            # Otherwise create_process_measurement_properties will raise an exception when
            # it tries to get the value for a property.
            for property in self.preloaded_data['process_properties'].values():
                property['value'] = None
        except Exception as e:
            self.base_errors.append(f'Property Type could not be found. {e}')

    def import_template_inner(self):
        sheet = self.sheets['Normalization']

        # Add the template to the process
        if self.imported_file is not None:
            self.preloaded_data['process'].imported_template_id = self.imported_file.id
            self.preloaded_data['process'].save()

        for row_id, row_data in enumerate(sheet.rows):
            process_measurement_properties = self.preloaded_data['process_properties']

            volume_used = float_to_decimal_and_none(row_data['Volume Used (uL)'])
            normalization_date = input_to_date_and_none(row_data['Normalization Date (YYYY-MM-DD)'])

            source_sample = {
                'container': {'barcode': str_cast_and_normalize(row_data['Source Container Barcode'])},
                'coordinates': str_cast_and_normalize(row_data['Source Container Coord']),
                'depleted': check_truth_like(row_data['Source Depleted']) if row_data['Source Depleted'] else None,
            }

            destination_sample = {
                'coordinates': str_cast_and_normalize(row_data['Destination Container Coord']),
                'volume': float_to_decimal_and_none(row_data['Volume (uL)']),
                'concentration_ngul': float_to_decimal_and_none(row_data['Conc. (ng/uL)']),
                'concentration_nm' : float_to_decimal_and_none(row_data['Conc. (nM)']),
                'creation_date': normalization_date,
                'container': {
                    'barcode': str_cast_and_normalize(row_data['Destination Container Barcode']),
                    'name': str_cast_and_normalize(row_data['Destination Container Name']),
                    'kind': str_cast_and_normalize(row_data['Destination Container Kind']),
                    'coordinates': str_cast_and_normalize(row_data['Destination Parent Container Coord']),
                    'parent_barcode': str_cast_and_normalize(row_data['Destination Parent Container Barcode']),
                },
            }

            process_measurement = {
                'execution_date': normalization_date,
                'volume_used': volume_used,
                'comment': str_cast_and_normalize(row_data['Comment']),
                'process': self.preloaded_data['process']
            }

            normalization_kwargs = dict(
                source_sample=source_sample,
                destination_sample=destination_sample,
                process_measurement=process_measurement,
                process_measurement_properties=process_measurement_properties,
            )

            (result, _) = self.handle_row(
                row_handler_class=NormalizationRowHandler,
                sheet=sheet,
                row_i=row_id,
                **normalization_kwargs,
            )