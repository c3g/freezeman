from fms_core.models import Protocol, Process
from ._generic import GenericImporter
from fms_core.template_importer.row_handlers.sample_identity_qc import SampleIdentityQCRowHandler
from fms_core.templates import SAMPLE_IDENTITY_QC_TEMPLATE
from .._utils import float_to_decimal_and_none, input_to_date_and_none
from fms_core.utils import str_cast_and_normalize
from fms_core.services.step import get_step_from_template

class SampleIdentityQCImporter(GenericImporter):
    SHEETS_INFO = SAMPLE_IDENTITY_QC_TEMPLATE["sheets info"]

    def __init__(self):
        super().__init__()
        self.initialize_data_for_template()


    def initialize_data_for_template(self):
        #Get protocol for Sample Identity Quality Control
        protocol = Protocol.objects.get(name='Sample Identity Quality Control')

        self.preloaded_data = {'process': None, 'protocol': protocol}

        self.preloaded_data['process'] = Process.objects.create(protocol=Protocol.objects.get(name="Sample Identity Quality Control"),
                                                                comment="Sample Identity Quality Control (imported from template)")

    def import_template_inner(self):
        sheet = self.sheets['SampleIdentityQC']

        # Identify for each row of the matching workflow step
        step_by_row_id, errors, warnings = get_step_from_template(self.preloaded_data['protocol'], self.sheets, self.SHEETS_INFO)
        self.base_errors.extend(errors)

        # Add the template to the process
        if self.imported_file is not None:
            self.preloaded_data['process'].imported_template_id = self.imported_file.id
            self.preloaded_data['process'].save()

        for row_id, row_data in enumerate(sheet.rows):
            volume_used_decimal = float_to_decimal_and_none(row_data['Volume Used (uL)'])
            qc_date = input_to_date_and_none(row_data['QC Date (YYYY-MM-DD)'])

            sample = {
                'coordinates': str_cast_and_normalize(row_data['Sample Container Coord']),
                'container': {'barcode': str_cast_and_normalize(row_data['Sample Container Barcode'])},
                'identity_flag': str_cast_and_normalize(row_data['Identity Flag']),
            }

            process_measurement = {
                'execution_date': qc_date,
                'volume_used': volume_used_decimal,
                'comment': str_cast_and_normalize(row_data['Comment']),
                'process': self.preloaded_data['process']
            }

            workflow = {
                'step_action': str_cast_and_normalize(row_data['Workflow Action']),
                'step': step_by_row_id[row_id]
            }

            identity_qc_kwargs = dict(
                sample=sample,
                process_measurement=process_measurement,
                workflow=workflow,
            )

            (result, _) = self.handle_row(
                row_handler_class=SampleIdentityQCRowHandler,
                sheet=sheet,
                row_i=row_id,
                **identity_qc_kwargs,
            )