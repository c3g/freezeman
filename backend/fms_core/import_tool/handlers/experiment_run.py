from datetime import datetime
from pandas import pandas as pd

from fms_core.models import ExperimentType, PropertyType, Instrument, Container
from ._generic import GenericHandler
from ...services import create_experiment_run


class ExperimentRunHandler(GenericHandler):
    def __init__(self, experiment_type_obj, instrument, container, start_date,
                 samples, properties, protocols_dict, properties_by_name_dict):

        self.experiment_run = {'experiment_type': experiment_type_obj, 'instrument': None, 'container': None,
                               'process': None, 'start_date': start_date}

        # Get Instrument
        instrument_name = instrument['name']
        if instrument_name:
            try:
                self.experiment_run['instrument'] = Instrument.objects.get(name=instrument_name)
            except Exception as e:
                self.errors["instrument"] = f"No instrument named {instrument_name} could be found."

        # Get or Create Container
        barcode = container['barcode']
        kind = container['kind']
        if barcode and kind:
            try:
                self.experiment_run['container'], _ = Container.objects.get_or_create(
                    barcode=barcode,
                    kind=kind,
                    defaults={'comment': f"Automatically generated via experiment run creation on "
                                         f"{datetime.utcnow().isoformat()}Z",
                              'name': barcode},
                )
            except Exception as e:
                self.errors[
                    "container"] = f"Could not create experiment container. Barcode {barcode} and kind {kind} are existing and do not match."



        # Calling the service creator for ExperimentRun

        try:
            result = create_experiment_run(self.experiment_run['experiment_type'],
                                                       self.experiment_run['instrument'],
                                                       self.experiment_run['container'],
                                                       self.experiment_run['start_date'],
                                                       samples,
                                                       properties,
                                                       protocols_dict,
                                                       properties_by_name_dict)

            if result['errors'] != {}:
                self.errors = result['errors']

        except Exception as e:
            self.errors["experiment_run"] = e




    def get_result(self):
        return super().get_result()